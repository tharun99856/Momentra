import { Router, type Request, type Response, type NextFunction } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { socialService, type AddCommentDto } from '../services/social.service.js'
import { prisma } from '../lib/prisma.js'
import { getMediaUrl } from '../lib/storage.js'

const router = Router()

router.post(
  '/media/:mediaId/likes',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mediaId = req.params.mediaId as string
      const userId = req.user!.sub

      const media = await prisma.media.findUnique({
        where: { id: mediaId },
        select: { id: true },
      })
      if (!media) {
        res.status(404).json({ error: 'Media not found' })
        return
      }

      const result = await socialService.toggleLike(userId, mediaId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },
)

router.post(
  '/media/:mediaId/comments',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mediaId = req.params.mediaId as string
      const userId = req.user!.sub
      const { text, parentId } = req.body

      const media = await prisma.media.findUnique({
        where: { id: mediaId },
        select: { id: true },
      })
      if (!media) {
        res.status(404).json({ error: 'Media not found' })
        return
      }

      const dto: AddCommentDto = { mediaId, userId, text, parentId }
      const comment = await socialService.addComment(dto)
      res.status(201).json(comment)
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === 'Parent comment not found' ||
          error.message === 'Reply to reply not allowed'
        ) {
          res.status(400).json({ error: error.message })
          return
        }
      }
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors })
        return
      }
      next(error)
    }
  },
)

router.patch(
  '/comments/:commentId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const commentId = req.params.commentId as string
      const userId = req.user!.sub
      const { text } = req.body

      if (!text || typeof text !== 'string') {
        res.status(400).json({ error: 'Text is required' })
        return
      }

      const updated = await socialService.editComment(commentId, userId, text)
      res.status(200).json(updated)
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Comment not found') {
          res.status(404).json({ error: error.message })
          return
        }
        if (error.message === 'Edit window has closed' || error.message === 'Forbidden') {
          res.status(403).json({ error: error.message })
          return
        }
        if (error.message === 'Comment text must be 1-500 characters') {
          res.status(400).json({ error: error.message })
          return
        }
      }
      next(error)
    }
  },
)

router.delete(
  '/comments/:commentId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const commentId = req.params.commentId as string
      const userId = req.user!.sub

      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        include: { media: { include: { event: { select: { clubId: true } } } } },
      })
      if (!comment) {
        res.status(404).json({ error: 'Comment not found' })
        return
      }

      const membership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: comment.media.event.clubId, userId } },
        select: { role: true },
      })
      const isClubAdmin = membership?.role === 'admin'

      await socialService.deleteComment(commentId, userId, isClubAdmin)
      res.status(204).send()
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Comment not found') {
          res.status(404).json({ error: error.message })
          return
        }
        if (error.message === 'Forbidden') {
          res.status(403).json({ error: 'Forbidden' })
          return
        }
      }
      next(error)
    }
  },
)

router.post(
  '/media/:mediaId/favourites',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mediaId = req.params.mediaId as string
      const userId = req.user!.sub

      const media = await prisma.media.findUnique({
        where: { id: mediaId },
        select: { id: true },
      })
      if (!media) {
        res.status(404).json({ error: 'Media not found' })
        return
      }

      const result = await socialService.toggleFavourite(userId, mediaId)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  },
)

router.get(
  '/users/me/favourites',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.sub
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 24))

      const [favourites, total] = await Promise.all([
        prisma.favourite.findMany({
          where: { userId },
          include: {
            media: {
              include: {
                event: { select: { visibility: true, clubId: true } },
                _count: { select: { likes: true, comments: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.favourite.count({ where: { userId } }),
      ])

      const items = favourites.map((fav: any) => {
        const m = fav.media
        return {
          id: m.id,
          eventId: m.eventId,
          uploaderId: m.uploaderId,
          mediaType: m.mediaType,
          signedUrl: getMediaUrl(m.compressedUrl),
          thumbMdUrl: getMediaUrl(m.thumbMdUrl),
          thumbSmUrl: getMediaUrl(m.thumbSmUrl),
          likesCount: m._count.likes,
          commentsCount: m._count.comments,
          tags: m.tags,
          uploadedAt: m.uploadedAt.toISOString(),
        }
      })

      res.status(200).json({
        items, total, page, pageSize, totalPages: Math.ceil(total / pageSize),
      })
    } catch (error) {
      next(error)
    }
  },
)

router.get(
  '/media/:mediaId/share',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const mediaId = req.params.mediaId as string
      const userId = req.user!.sub

      const media = await prisma.media.findUnique({
        where: { id: mediaId },
        include: { event: { select: { id: true, visibility: true, clubId: true } } },
      })
      if (!media) {
        res.status(404).json({ error: 'Media not found' })
        return
      }

      if (media.event.visibility === 'private') {
        const membership = await prisma.clubMember.findUnique({
          where: { clubId_userId: { clubId: media.event.clubId, userId } },
        })
        if (!membership) {
          res.status(403).json({ error: 'Forbidden' })
          return
        }
      }

      const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'
      res.status(200).json({
        url: `${clientOrigin}/events/${media.event.id}?photo=${mediaId}`,
      })
    } catch (error) {
      next(error)
    }
  },
)

export default router
