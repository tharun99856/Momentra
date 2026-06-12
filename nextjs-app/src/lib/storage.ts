/**
 * Storage adapter — local disk in development, Cloudinary in production.
 *
 * Development:  files go to  <project>/uploads/  and are served at /uploads/*
 * Production:   CLOUDINARY_CLOUD_NAME must be set; files go to Cloudinary.
 *
 * Required env vars (production only):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

import { existsSync, mkdirSync } from 'fs'
import { writeFile, readFile, unlink } from 'fs/promises'
import path from 'path'

// ─── helpers ────────────────────────────────────────────────────────────────

function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

// ─── local disk ─────────────────────────────────────────────────────────────

async function localUpload(key: string, buffer: Buffer): Promise<string> {
  const filePath = path.join(UPLOADS_DIR, key)
  ensureDir(filePath)
  await writeFile(filePath, buffer)
  return `/uploads/${key}`          // URL served by Next.js static handler
}

async function localDelete(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await unlink(path.join(UPLOADS_DIR, key))
      } catch {
        // already gone — fine
      }
    })
  )
}

function localGetUrl(key: string | null): string | null {
  if (!key) return null
  // If it's already a full URL (Cloudinary) pass through
  if (key.startsWith('http://') || key.startsWith('https://')) return key
  // If it's a /uploads/ path pass through
  if (key.startsWith('/uploads/')) return key
  // Otherwise build it
  return `/uploads/${key}`
}

// ─── Cloudinary ─────────────────────────────────────────────────────────────

async function cloudinaryUpload(key: string, buffer: Buffer, mimeType: string): Promise<string> {
  const { v2: cloudinary } = await import('cloudinary')
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })

  return new Promise((resolve, reject) => {
    const publicId = `momentra/${key.replace(/\.[^.]+$/, '')}`
    const uploadStream = cloudinary.uploader.upload_stream(
      { public_id: publicId, resource_type: 'auto', overwrite: true },
      (error, result) => {
        if (error || !result) reject(error ?? new Error('Cloudinary upload failed'))
        else resolve(result.secure_url)
      }
    )
    uploadStream.end(buffer)
  })
}

async function cloudinaryDelete(keys: string[]): Promise<void> {
  const { v2: cloudinary } = await import('cloudinary')
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  await Promise.all(
    keys.map(async (key) => {
      try {
        const publicId = `momentra/${key.replace(/\.[^.]+$/, '')}`
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })
      } catch {
        console.warn('[storage] Failed to delete from Cloudinary:', key)
      }
    })
  )
}

// ─── public API ─────────────────────────────────────────────────────────────

export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (isCloudinaryConfigured()) {
    return cloudinaryUpload(key, buffer, mimeType)
  }
  return localUpload(key, buffer)
}

export async function deleteFiles(keys: string[]): Promise<void> {
  if (isCloudinaryConfigured()) {
    return cloudinaryDelete(keys)
  }
  return localDelete(keys)
}

/**
 * Returns a public-facing URL for a stored key.
 * Works whether the key is a Cloudinary URL, a /uploads/ path, or a raw key.
 */
export function getMediaUrl(key: string | null): string | null {
  if (!key) return null
  if (key.startsWith('http://') || key.startsWith('https://')) return key
  if (key.startsWith('/uploads/')) return key
  return `/uploads/${key}`
}

/**
 * Read a file buffer from local disk.
 * Only used for the watermarked-download route in development.
 */
export async function getFileBuffer(keyOrUrl: string): Promise<Buffer> {
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
    const res = await fetch(keyOrUrl)
    if (!res.ok) throw new Error(`Failed to fetch: ${keyOrUrl}`)
    return Buffer.from(await res.arrayBuffer())
  }
  const key = keyOrUrl.startsWith('/uploads/') ? keyOrUrl.slice(9) : keyOrUrl
  return readFile(path.join(UPLOADS_DIR, key))
}
