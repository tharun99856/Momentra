import { Router, type Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
import crypto from 'crypto'
import { extname } from 'path'
import { z } from 'zod'
import { requireAuth, resolveClubContext, requireClubRole } from '../middleware/auth.js'
import { uploadConcurrencyLimiter } from '../middleware/security.js'
import { prisma } from '../lib/prisma.js'
import { processImageVariants } from '../lib/image-processor.js'
import { originalKey, compressedKey, thumbSmKey, thumbMdKey } from '../lib/paths.js'
import { uploadFile, deleteFiles, getMediaUrl, getFileBuffer } from '../lib/storage.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 50,
  },
})

const UploadMetadataSchema = z.object({
  tags: z.string().optional().transform((val) => {
    if (!val) return []
    return val.split(',').map((tag) => tag.trim()).filter(Boolean)
  }),
  caption: z.string().max(500).optional(),
})

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'video/mp4',
  'video/quicktime',
] as const

interface MediaRecord {
  id: string
  eventId: string
  uploaderId: string
  mediaType: 'photo' | 'video'
  tags: string[]
  caption: string | null
  uploadedAt: Date
  compressedUrl: string | null
  thumbSmUrl: string | null
  thumbMdUrl: string | null
}

router.post(
  '/events/:eventId/media',
  requireAuth,
  resolveClubContext,
  requireClubRole('photographer'),
  uploadConcurrencyLimiter,
  upload.array('files', 50),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventId = req.params.eventId as string
      const files = req.files as Express.Multer.File[] | undefined

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'At least 1 file is required' })
        return
      }
      if (files.length > 50) {
        res.status(400).json({ error: 'Maximum 50 files per upload' })
        return
      }

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, coverPhotoId: true },
      })
      if (!event) {
        res.status(404).json({ error: 'Event not found' })
        return
      }

      const metadataResult = UploadMetadataSchema.safeParse(req.body)
      if (!metadataResult.success) {
        res.status(400).json({ error: 'Invalid metadata', details: metadataResult.error.message })
        return
      }
      const metadata = metadataResult.data

      for (const file of files) {
        if (file.size > 100 * 1024 * 1024) {
          res.status(400).json({ error: `File ${file.originalname} exceeds 100 MB` })
          return
        }
        const fileType = await fileTypeFromBuffer(file.buffer)
        const detectedMime = fileType?.mime
        if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime as any)) {
          res.status(400).json({
            error: `Unsupported file type: ${file.originalname}`,
            details: `Detected MIME: ${detectedMime ?? 'unknown'}`,
          })
          return
        }
        file.mimetype = detectedMime
      }

      const uploadedKeys: string[] = []
      const mediaRecords: MediaRecord[] = []

      try {
        const processed: Array<{
          uuid: string
          isVideo: boolean
          originalS3Key: string
          compressedS3Key: string | null
          thumbSmS3Key: string | null
          thumbMdS3Key: string | null
          width: number | null
          height: number | null
          file: Express.Multer.File
        }> = []

        for (const file of files) {
          const uuid = crypto.randomUUID()
          const isVideo = file.mimetype.startsWith('video/')
          const ext = extname(file.originalname) || (isVideo ? '.mp4' : '.jpg')

          const originalS3Key = originalKey(eventId, uuid, ext)
          await uploadFile(originalS3Key, file.buffer, file.mimetype)
          uploadedKeys.push(originalS3Key)

          let compressedS3Key: string | null = null
          let thumbSmS3Key: string | null = null
          let thumbMdS3Key: string | null = null
          let width: number | null = null
          let height: number | null = null

          if (!isVideo) {
            const variants = await processImageVariants(file.buffer)
            width = variants.width
            height = variants.height
            compressedS3Key = compressedKey(uuid)
            thumbSmS3Key = thumbSmKey(uuid)
            thumbMdS3Key = thumbMdKey(uuid)

            await Promise.all([
              uploadFile(compressedS3Key, variants.compressed, 'image/jpeg'),
              uploadFile(thumbSmS3Key, variants.thumbSm, 'image/jpeg'),
              uploadFile(thumbMdS3Key, variants.thumbMd, 'image/jpeg'),
            ])
            uploadedKeys.push(compressedS3Key, thumbSmS3Key, thumbMdS3Key)
          }

          processed.push({
            uuid, isVideo, originalS3Key, compressedS3Key, thumbSmS3Key, thumbMdS3Key,
            width, height, file,
          })
        }

        await prisma.$transaction(async (tx: any) => {
          for (const d of processed) {
            const media = await tx.media.create({
              data: {
                id: d.uuid,
                eventId,
                uploaderId: req.user!.sub,
                originalUrl: d.originalS3Key,
                compressedUrl: d.compressedS3Key,
                thumbSmUrl: d.thumbSmS3Key,
                thumbMdUrl: d.thumbMdS3Key,
                mediaType: d.isVideo ? 'video' : 'photo',
                sizeBytes: d.file.size,
                width: d.width,
                height: d.height,
                tags: metadata.tags,
                caption: metadata.caption,
              },
            })
            mediaRecords.push({
              id: media.id,
              eventId: media.eventId,
              uploaderId: media.uploaderId,
              mediaType: media.mediaType,
              tags: media.tags,
              caption: media.caption,
              uploadedAt: media.uploadedAt,
              compressedUrl: media.compressedUrl,
              thumbSmUrl: media.thumbSmUrl,
              thumbMdUrl: media.thumbMdUrl,
            })
          }

          if (!event.coverPhotoId && mediaRecords.length > 0) {
            await tx.event.update({
              where: { id: eventId },
              data: { coverPhotoId: mediaRecords[0].id },
            })
          }
        })
      } catch (uploadError) {
        console.error('Batch upload failed:', uploadError)
        await deleteFiles(uploadedKeys)
        res.status(503).json({
          error: 'Upload failed',
          reason: uploadError instanceof Error ? uploadError.message : 'Unknown error',
        })
        return
      }

      const mediaDtos = mediaRecords.map((m) => ({
        id: m.id,
        eventId: m.eventId,
        uploaderId: m.uploaderId,
        mediaType: m.mediaType,
        tags: m.tags,
        caption: m.caption,
        uploadedAt: m.uploadedAt.toISOString(),
        signedUrl: getMediaUrl(m.compressedUrl),
        thumbSmUrl: getMediaUrl(m.thumbSmUrl),
        thumbMdUrl: getMediaUrl(m.thumbMdUrl),
      }))

      res.status(201).json({ media: mediaDtos })
    } catch (error) {
      next(error)
    }
  }
)

router.get(
  '/media/:mediaId/download',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mediaId = req.params.mediaId as string
      const userId = req.user!.sub

      const media = await prisma.media.findUnique({
        where: { id: mediaId },
        include: {
          event: { include: { club: { select: { id: true, name: true } } } },
          uploader: { select: { username: true } },
        },
      })
      if (!media) {
        res.status(404).json({ error: 'Media not found' })
        return
      }

      if (media.event.visibility === 'private') {
        const membership = await prisma.clubMember.findUnique({
          where: { clubId_userId: { clubId: media.event.club.id, userId } },
          select: { role: true },
        })
        if (!membership) {
          res.status(403).json({ error: 'Forbidden' })
          return
        }
        req.clubRole = membership.role
      }

      if (media.event.visibility === 'public' && !req.clubRole) {
        const membership = await prisma.clubMember.findUnique({
          where: { clubId_userId: { clubId: media.event.club.id, userId } },
          select: { role: true },
        })
        req.clubRole = membership?.role ?? null
      }

      if (media.mediaType === 'video') {
        const videoUrl = getMediaUrl(media.originalUrl)
        if (videoUrl) res.redirect(videoUrl)
        else res.status(404).json({ error: 'Video not found' })
        return
      }

      const originalBuffer = await getFileBuffer(media.originalUrl)
      const { applyWatermark } = await import('../lib/image-processor.js')

      const downloader = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { username: true },
      })

      const role = req.clubRole ?? 'viewer'
      const photographerName = role === 'photographer' ? downloader.username : undefined

      const watermarkedBuffer = await applyWatermark(
        originalBuffer,
        role,
        media.event.club.name,
        media.event.name,
        photographerName,
      )

      await prisma.download.create({ data: { userId, mediaId } })

      const filename = `${media.event.name.replace(/[^a-z0-9]/gi, '_')}_${media.id}.jpg`
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(watermarkedBuffer)
    } catch (error) {
      next(error)
    }
  },
)

router.get(
  '/events/:eventId/media',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const eventId = req.params.eventId as string
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50))
      const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined

      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, visibility: true, clubId: true },
      })
      if (!event) {
        res.status(404).json({ error: 'Event not found' })
        return
      }

      if (event.visibility === 'private') {
        if (!req.user) {
          res.status(403).json({ error: 'Forbidden' })
          return
        }
        const membership = await prisma.clubMember.findUnique({
          where: { clubId_userId: { clubId: event.clubId, userId: req.user.sub } },
        })
        if (!membership) {
          res.status(403).json({ error: 'Forbidden' })
          return
        }
      }

      const where: any = { eventId }
      if (tags) where.tags = { hasSome: tags }

      const [media, total] = await Promise.all([
        prisma.media.findMany({
          where,
          orderBy: { uploadedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            uploader: { select: { id: true, username: true } },
            _count: { select: { likes: true, comments: true } },
          },
        }),
        prisma.media.count({ where }),
      ])

      const userId = req.user?.sub
      let userLikes = new Set<string>()
      if (userId) {
        const likes = await prisma.like.findMany({
          where: { userId, mediaId: { in: media.map((m) => m.id) } },
          select: { mediaId: true },
        })
        userLikes = new Set(likes.map((l) => l.mediaId))
      }

      const data = media.map((m) => ({
        id: m.id,
        eventId: m.eventId,
        uploaderId: m.uploaderId,
        uploaderName: m.uploader.username,
        mediaType: m.mediaType,
        signedUrl: getMediaUrl(m.compressedUrl),
        thumbSmUrl: getMediaUrl(m.thumbSmUrl),
        thumbMdUrl: getMediaUrl(m.thumbMdUrl),
        width: m.width,
        height: m.height,
        tags: m.tags,
        caption: m.caption,
        likesCount: m._count.likes,
        commentsCount: m._count.comments,
        liked: userLikes.has(m.id),
        uploadedAt: m.uploadedAt.toISOString(),
      }))

      res.json({
        data,
        pagination: { page, pageSize, total, hasMore: page * pageSize < total },
      })
    } catch (error) {
      next(error)
    }
  },
)

router.get(
  '/media/:mediaId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mediaId = req.params.mediaId as string

      const media = await prisma.media.findUnique({
        where: { id: mediaId },
        include: {
          event: { include: { club: { select: { id: true, name: true } } } },
          uploader: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { likes: true, comments: true, downloads: true } },
          photoTags: {
            include: { user: { select: { id: true, username: true, avatarUrl: true } } },
          },
        },
      })
      if (!media) {
        res.status(404).json({ error: 'Media not found' })
        return
      }

      let liked = false
      let favourited = false
      if (req.user) {
        const [like, fav] = await Promise.all([
          prisma.like.findUnique({ where: { userId_mediaId: { userId: req.user.sub, mediaId } } }),
          prisma.favourite.findUnique({ where: { userId_mediaId: { userId: req.user.sub, mediaId } } }),
        ])
        liked = !!like
        favourited = !!fav
      }

      res.json({
        id: media.id,
        eventId: media.eventId,
        event: media.event,
        uploader: media.uploader,
        mediaType: media.mediaType,
        signedUrl: getMediaUrl(media.compressedUrl),
        originalUrl: getMediaUrl(media.originalUrl),
        thumbSmUrl: getMediaUrl(media.thumbSmUrl),
        thumbMdUrl: getMediaUrl(media.thumbMdUrl),
        width: media.width,
        height: media.height,
        tags: media.tags,
        caption: media.caption,
        likesCount: media._count.likes,
        commentsCount: media._count.comments,
        downloadsCount: media._count.downloads,
        liked,
        favourited,
        taggedUsers: media.photoTags.map((t) => t.user),
        uploadedAt: media.uploadedAt.toISOString(),
      })
    } catch (error) {
      next(error)
    }
  },
)

router.delete(
  '/media/:mediaId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mediaId = req.params.mediaId as string
      const userId = req.user!.sub

      const media = await prisma.media.findUnique({
        where: { id: mediaId },
        include: { event: { select: { clubId: true } } },
      })
      if (!media) {
        res.status(404).json({ error: 'Media not found' })
        return
      }

      const membership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: media.event.clubId, userId } },
      })
      const isUploader = media.uploaderId === userId
      const isAdmin = membership?.role === 'admin'
      if (!isUploader && !isAdmin) {
        res.status(403).json({ error: 'Forbidden' })
        return
      }

      const keys = [media.originalUrl, media.compressedUrl, media.thumbSmUrl, media.thumbMdUrl]
        .filter(Boolean) as string[]
      await deleteFiles(keys)
      await prisma.media.delete({ where: { id: mediaId } })
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  },
)

router.get(
  '/media/:mediaId/comments',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mediaId = req.params.mediaId as string
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 20))

      const [comments, total] = await Promise.all([
        prisma.comment.findMany({
          where: { mediaId, parentId: null },
          orderBy: { createdAt: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
            replies: {
              orderBy: { createdAt: 'asc' },
              include: { user: { select: { id: true, username: true, avatarUrl: true } } },
            },
          },
        }),
        prisma.comment.count({ where: { mediaId, parentId: null } }),
      ])

      res.json({ data: comments, total, page, pageSize })
    } catch (error) {
      next(error)
    }
  },
)

export default router
