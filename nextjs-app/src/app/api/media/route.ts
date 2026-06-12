/**
 * POST /api/media
 * Upload media files to an event.
 *
 * Body: multipart/form-data
 *   - files: File[] (1-50 files, max 100 MB each)
 *   - eventId: string (UUID)
 *   - tags: string (comma-separated, optional)
 *   - caption: string (optional, max 500 chars)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processImageVariants } from '@/lib/image-processor'
import { uploadFile, deleteFiles, getMediaUrl } from '@/lib/storage'
import { toApiError, ForbiddenError, NotFoundError } from '@/lib/errors'
import { fileTypeFromBuffer } from 'file-type'
import crypto from 'crypto'

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime',
] as const

type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number]

function extForMime(mime: AllowedMime): string {
  const map: Record<AllowedMime, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
  }
  return map[mime] ?? '.bin'
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)

    const formData = await request.formData()
    const eventId = formData.get('eventId')
    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 })
    }

    // Check club membership (photographer or admin)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, clubId: true, coverPhotoId: true },
    })
    if (!event) throw new NotFoundError('Event not found')

    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: event.clubId, userId: user.sub } },
    })
    if (!membership || (membership.role !== 'photographer' && membership.role !== 'admin')) {
      throw new ForbiddenError('Only photographers and admins can upload media')
    }

    const rawFiles = formData.getAll('files') as File[]
    if (rawFiles.length === 0) {
      return NextResponse.json({ error: 'At least 1 file is required' }, { status: 400 })
    }
    if (rawFiles.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 files per upload' }, { status: 400 })
    }

    const rawTags = formData.get('tags')
    const tags = rawTags
      ? String(rawTags).split(',').map((t) => t.trim()).filter(Boolean)
      : []
    const caption = formData.get('caption') ? String(formData.get('caption')).slice(0, 500) : null

    // Read all file buffers and validate types
    const fileEntries: { buffer: Buffer; mime: AllowedMime; name: string; size: number }[] = []
    for (const file of rawFiles) {
      const buffer = Buffer.from(await file.arrayBuffer())
      if (buffer.length > 100 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${file.name} exceeds 100 MB` }, { status: 400 })
      }
      const detected = await fileTypeFromBuffer(buffer)
      const mime = detected?.mime
      if (!mime || !ALLOWED_MIME_TYPES.includes(mime as AllowedMime)) {
        return NextResponse.json(
          { error: `Unsupported file type: ${file.name}`, details: `Detected: ${mime ?? 'unknown'}` },
          { status: 400 }
        )
      }
      fileEntries.push({ buffer, mime: mime as AllowedMime, name: file.name, size: buffer.length })
    }

    const uploadedKeys: string[] = []
    const mediaRecords: {
      uuid: string
      isVideo: boolean
      originalUrl: string
      compressedUrl: string | null
      thumbSmUrl: string | null
      thumbMdUrl: string | null
      width: number | null
      height: number | null
      size: number
    }[] = []

    try {
      for (const entry of fileEntries) {
        const uuid = crypto.randomUUID()
        const isVideo = entry.mime.startsWith('video/')
        const ext = extForMime(entry.mime)
        const originalKey = `events/${eventId}/originals/${uuid}${ext}`

        const originalUrl = await uploadFile(originalKey, entry.buffer, entry.mime)
        uploadedKeys.push(originalKey)

        let compressedUrl: string | null = null
        let thumbSmUrl: string | null = null
        let thumbMdUrl: string | null = null
        let width: number | null = null
        let height: number | null = null

        if (!isVideo) {
          const variants = await processImageVariants(entry.buffer)
          width = variants.width
          height = variants.height

          const compressedKey = `compressed/${uuid}.jpg`
          const thumbSmKey = `thumbs/sm/${uuid}.jpg`
          const thumbMdKey = `thumbs/md/${uuid}.jpg`

          ;[compressedUrl, thumbSmUrl, thumbMdUrl] = await Promise.all([
            uploadFile(compressedKey, variants.compressed, 'image/jpeg'),
            uploadFile(thumbSmKey, variants.thumbSm, 'image/jpeg'),
            uploadFile(thumbMdKey, variants.thumbMd, 'image/jpeg'),
          ])
          uploadedKeys.push(compressedKey, thumbSmKey, thumbMdKey)
        }

        mediaRecords.push({ uuid, isVideo, originalUrl, compressedUrl, thumbSmUrl, thumbMdUrl, width, height, size: entry.size })
      }

      const created: { id: string; compressedUrl: string | null; thumbSmUrl: string | null; thumbMdUrl: string | null; mediaType: string; tags: string[]; caption: string | null; uploadedAt: Date }[] = []

      await prisma.$transaction(async (tx) => {
        for (const d of mediaRecords) {
          const media = await tx.media.create({
            data: {
              id: d.uuid,
              eventId,
              uploaderId: user.sub,
              originalUrl: d.originalUrl,
              compressedUrl: d.compressedUrl,
              thumbSmUrl: d.thumbSmUrl,
              thumbMdUrl: d.thumbMdUrl,
              mediaType: d.isVideo ? 'video' : 'photo',
              sizeBytes: d.size,
              width: d.width,
              height: d.height,
              tags,
              caption,
            },
          })
          created.push(media)
        }

        if (!event.coverPhotoId && created.length > 0) {
          await tx.event.update({ where: { id: eventId }, data: { coverPhotoId: created[0]!.id } })
        }
      })

      const mediaDtos = created.map((m) => ({
        id: m.id,
        eventId,
        uploaderId: user.sub,
        mediaType: m.mediaType,
        tags: m.tags,
        caption: m.caption,
        uploadedAt: m.uploadedAt.toISOString(),
        signedUrl: getMediaUrl(m.compressedUrl),
        thumbSmUrl: getMediaUrl(m.thumbSmUrl),
        thumbMdUrl: getMediaUrl(m.thumbMdUrl),
      }))

      return NextResponse.json({ media: mediaDtos }, { status: 201 })
    } catch (uploadError) {
      console.error('Batch upload failed:', uploadError)
      await deleteFiles(uploadedKeys)
      return NextResponse.json(
        { error: 'Upload failed', reason: uploadError instanceof Error ? uploadError.message : 'Unknown' },
        { status: 503 }
      )
    }
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
