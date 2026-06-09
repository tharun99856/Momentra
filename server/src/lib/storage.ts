import { existsSync, mkdirSync } from 'fs'
import { writeFile, readFile, unlink } from 'fs/promises'
import { join, dirname } from 'path'

const UPLOADS_DIR = join(process.cwd(), 'uploads')

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true })
}

export async function uploadFile(key: string, buffer: Buffer, _contentType: string): Promise<void> {
  const filePath = join(UPLOADS_DIR, key)
  const dir = dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  await writeFile(filePath, buffer)
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  return readFile(join(UPLOADS_DIR, key))
}

export async function deleteFiles(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      try {
        await unlink(join(UPLOADS_DIR, key))
      } catch {
        // already gone — fine
      }
    }),
  )
}

export function getMediaUrl(key: string | null): string | null {
  return key ? `/uploads/${key}` : null
}
