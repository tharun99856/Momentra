// Event API routes

import { Router, type Request, type Response } from 'express'
import { eventService } from '../services/event.service.js'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { getMediaUrl } from '../lib/storage.js'
import type { AuthenticatedRequest } from '../types/express.js'
import type { ViewerContext } from '../types/event.types.js'

const router = Router()

/**
 * POST /api/clubs/:clubId/events
 * Create a new event (photographer or admin only)
 */
router.post(
  '/:clubId/events',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const authedReq = req as AuthenticatedRequest
      const clubId = req.params.clubId

      if (typeof clubId !== 'string') {
        res.status(400).json({ error: 'Invalid club ID' })
        return
      }

      // Check club membership and role
      const membership = await prisma.clubMember.findUnique({
        where: {
          clubId_userId: {
            clubId,
            userId: authedReq.user.sub,
          },
        },
      })

      if (!membership || (membership.role !== 'photographer' && membership.role !== 'admin')) {
        res.status(403).json({ error: 'Forbidden' })
        return
      }

      const event = await eventService.create(req.body, authedReq.user.sub, clubId)
      res.status(201).json(event)
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
)

/**
 * GET /api/clubs/:clubId/events
 * List events for a club with filters
 */
router.get(
  '/:clubId/events',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const clubId = req.params.clubId

      if (typeof clubId !== 'string') {
        res.status(400).json({ error: 'Invalid club ID' })
        return
      }

      // Build viewer context
      const viewer: ViewerContext = {
        userId: req.user?.sub,
        clubMemberships: {},
      }

      if (req.user) {
        const memberships = await prisma.clubMember.findMany({
          where: { userId: req.user.sub },
        })
        for (const m of memberships) {
          viewer.clubMemberships[m.clubId] = m.role
        }
      }

      // Parse query params
      const query: any = {
        sort: req.query.sort,
        category: req.query.category
          ? Array.isArray(req.query.category)
            ? req.query.category
            : [req.query.category]
          : undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        visibility: req.query.visibility as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
      }

      const result = await eventService.findMany(query, viewer, clubId)
      res.status(200).json(result)
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
)

/**
 * GET /api/events
 * List all events (cross-club) — needed by frontend's events page & upload dropdown
 */
router.get(
  '/',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20))
      const sort = (req.query.sort as string) || 'date_desc'
      const category = req.query.category
        ? Array.isArray(req.query.category) ? req.query.category : [req.query.category]
        : undefined
      const visibility = req.query.visibility as string | undefined
      const from = req.query.from as string | undefined
      const to = req.query.to as string | undefined

      const where: any = {}

      // Visibility
      if (visibility && visibility !== 'all') {
        where.visibility = visibility
      } else if (!req.user) {
        where.visibility = 'public'
      } else {
        const memberships = await prisma.clubMember.findMany({ where: { userId: req.user!.sub }, select: { clubId: true } })
        const clubIds = memberships.map((m: any) => m.clubId)
        where.OR = [{ visibility: 'public' }, { clubId: { in: clubIds } }]
      }

      if (category && category.length > 0) where.category = { in: category }
      if (from || to) {
        where.date = {}
        if (from) where.date.gte = new Date(from)
        if (to) where.date.lte = new Date(to)
      }

      const orderBy: any = sort === 'date_asc' ? { date: 'asc' } : sort === 'name_asc' ? { name: 'asc' } : { date: 'desc' }

      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
          include: {
            club: { select: { id: true, name: true } },
            _count: { select: { media: true } },
          },
        }),
        prisma.event.count({ where }),
      ])

      // Fetch cover photos
      const coverPhotoIds = events.map((e: any) => e.coverPhotoId).filter(Boolean)
      let coverPhotos: Map<string, string | null> = new Map()
      if (coverPhotoIds.length > 0) {
        const photos = await prisma.media.findMany({
          where: { id: { in: coverPhotoIds } },
          select: { id: true, thumbMdUrl: true },
        })
        for (const p of photos) {
          coverPhotos.set(p.id, getMediaUrl(p.thumbMdUrl))
        }
      }

      const eventIds = events.map((e: any) => e.id)
      const likesByEvent: Record<string, number> = {}
      for (const eid of eventIds) {
        likesByEvent[eid] = await prisma.like.count({
          where: { media: { eventId: eid } },
        })
      }

      const data = events.map((event: any) => ({
        id: event.id,
        clubId: event.clubId,
        clubName: event.club.name,
        name: event.name,
        description: event.description,
        category: event.category,
        date: event.date,
        location: event.location,
        visibility: event.visibility,
        coverPhotoUrl: event.coverPhotoId ? coverPhotos.get(event.coverPhotoId) ?? null : null,
        mediaCount: event._count.media,
        likeCount: likesByEvent[event.id] ?? 0,
      }))

      res.json({ events: data, total, page, pageSize, hasMore: page * pageSize < total })
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
)

/**
 * GET /api/events/:id
 * Get event details
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id

    if (typeof eventId !== 'string') {
      res.status(400).json({ error: 'Invalid event ID' })
      return
    }

    // Build viewer context
    const viewer: ViewerContext = {
      userId: req.user?.sub,
      clubMemberships: {},
    }

    if (req.user) {
      const memberships = await prisma.clubMember.findMany({
        where: { userId: req.user.sub },
      })
      for (const m of memberships) {
        viewer.clubMemberships[m.clubId] = m.role
      }
    }

    const event = await eventService.findById(eventId, viewer)
    res.status(200).json(event)
  } catch (error) {
    if (error instanceof Error) {
      const statusCode = error.message.includes('not found')
        ? 404
        : error.message.includes('Access denied')
          ? 403
          : 400
      res.status(statusCode).json({ error: error.message })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

/**
 * PATCH /api/events/:id
 * Update event (creator or admin only)
 */
router.patch('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authedReq = req as AuthenticatedRequest
    const eventId = req.params.id

    if (typeof eventId !== 'string') {
      res.status(400).json({ error: 'Invalid event ID' })
      return
    }

    const event = await eventService.update(eventId, req.body, authedReq.user.sub)
    res.status(200).json(event)
  } catch (error) {
    if (error instanceof Error) {
      const statusCode = error.message.includes('not found')
        ? 404
        : error.message.includes('Forbidden')
          ? 403
          : error.message.includes('Cover photo')
            ? 400
            : 400
      res.status(statusCode).json({ error: error.message })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

/**
 * DELETE /api/events/:id
 * Delete event (creator or admin only)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const authedReq = req as AuthenticatedRequest
    const eventId = req.params.id

    if (typeof eventId !== 'string') {
      res.status(400).json({ error: 'Invalid event ID' })
      return
    }

    await eventService.delete(eventId, authedReq.user.sub)
    res.status(204).send()
  } catch (error) {
    if (error instanceof Error) {
      const statusCode = error.message.includes('not found')
        ? 404
        : error.message.includes('Forbidden')
          ? 403
          : 400
      res.status(statusCode).json({ error: error.message })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

export default router
