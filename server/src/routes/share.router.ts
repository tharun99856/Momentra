import { Router, type Request, type Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { getMediaUrl } from '../lib/storage.js'
import type { AuthenticatedRequest } from '../types/express.js'

const router = Router()

router.post(
  '/events/:eventId/share',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const eventId = req.params.eventId as string

      const event = await prisma.event.findUnique({ where: { id: eventId } })
      if (!event) {
        res.status(404).json({ error: 'Event not found' })
        return
      }

      const token = crypto.randomBytes(16).toString('hex')
      const host = req.get('host') ?? 'localhost'

      res.json({
        shareUrl: `${req.protocol}://${host}/share/${token}`,
        token,
        eventId,
      })
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.get(
  '/share/:token',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const events = await prisma.event.findMany({
        where: { visibility: 'public' },
        take: 1,
        include: {
          media: {
            take: 50,
            orderBy: { uploadedAt: 'desc' },
          },
          _count: { select: { media: true } },
        },
      })

      if (events.length === 0) {
        res.status(404).json({ error: 'Shared gallery not found or expired' })
        return
      }

      const event = events[0]
      res.json({
        event: {
          name: event.name,
          date: event.date,
          location: event.location,
          category: event.category,
          photoCount: event._count.media,
        },
        media: event.media.map((m: any) => ({
          id: m.id,
          url: getMediaUrl(m.compressedUrl || m.originalUrl),
          thumbUrl: getMediaUrl(m.thumbMdUrl || m.thumbSmUrl),
          width: m.width,
          height: m.height,
        })),
      })
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

router.get(
  '/workspace/stats',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authedReq = req as AuthenticatedRequest
      const userId = authedReq.user.sub

      const memberships = await prisma.clubMember.findMany({
        where: { userId },
        select: { clubId: true },
      })
      const clubIds = memberships.map((m: { clubId: string }) => m.clubId)

      const [totalEvents, totalPhotos, totalMembers] = await Promise.all([
        prisma.event.count({ where: { clubId: { in: clubIds } } }),
        prisma.media.count({ where: { event: { clubId: { in: clubIds } } } }),
        prisma.clubMember.count({ where: { clubId: { in: clubIds } } }),
      ])

      const storageResult = await prisma.media.aggregate({
        where: { event: { clubId: { in: clubIds } } },
        _sum: { sizeBytes: true },
      })
      const storageUsedBytes = Number(storageResult._sum.sizeBytes ?? 0)
      const storageUsedMB = Math.round(storageUsedBytes / (1024 * 1024))

      res.json({
        totalEvents,
        totalPhotos,
        totalMembers,
        storageUsedMB,
        storageLimitMB: 5120,
        plan: 'starter',
      })
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

export default router
