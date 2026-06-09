// Search API

import { Router, type Request, type Response, type NextFunction } from 'express'
import { prisma } from '../lib/prisma.js'
import { getMediaUrl } from '../lib/storage.js'
import { searchRateLimiter } from '../middleware/security.js'

const router = Router()

/**
 * GET /api/search
 * 
 * Full-text search over events and media.
 * 
 * Query params:
 * - q: Search query (optional, min 2 chars)
 * - tags: Comma-separated tags (optional)
 * - from: ISO date (optional)
 * - to: ISO date (optional)
 * - category: Event category (optional)
 * - page: Page number (default 1)
 * - pageSize: Results per page (default 20, max 50)
 * 
 * Response:
 * - 200: { events: EventSummary[], media: MediaSummary[], total: number }
 * - 400: { error: 'Query too short' }
 * 
 * Note: Respects visibility — private events excluded for non-members
 */
router.get(
  '/search',
  searchRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        q,
        tags,
        from,
        to,
        category,
        page = '1',
        pageSize = '20',
      } = req.query

      const userId = req.user?.sub
      const parsedPage = Math.max(1, parseInt(page as string))
      const parsedPageSize = Math.min(50, Math.max(1, parseInt(pageSize as string)))

      // If query string present, require min 2 chars
      if (q && typeof q === 'string' && q.length < 2) {
        res.status(400).json({ error: 'Query must be at least 2 characters' })
        return
      }

      // Build where clauses
      const whereClause: any = {}

      // Visibility filter: public OR user is member
      if (userId) {
        // Get user's club memberships
        const memberships = await prisma.clubMember.findMany({
          where: { userId },
          select: { clubId: true },
        })
        const clubIds = memberships.map((m: any) => m.clubId)

        whereClause.OR = [
          { visibility: 'public' },
          { clubId: { in: clubIds } },
        ]
      } else {
        // Anonymous users: public only
        whereClause.visibility = 'public'
      }

      // Category filter
      if (category && typeof category === 'string') {
        whereClause.category = category
      }

      // Date range filter
      if (from || to) {
        whereClause.date = {}
        if (from) whereClause.date.gte = new Date(from as string)
        if (to) whereClause.date.lte = new Date(to as string)
      }

      // Full-text search on events
      let events: any[] = []
      if (q && typeof q === 'string') {
        // Use PostgreSQL full-text search
        events = await prisma.$queryRaw`
          SELECT id, name, date, category, visibility, "coverPhotoId", "clubId"
          FROM events
          WHERE search_vector @@ plainto_tsquery('english', ${q})
          AND (visibility = 'public' ${userId ? `OR "clubId" IN (SELECT "clubId" FROM club_members WHERE "userId" = ${userId})` : ''})
          ${category ? `AND category = ${category}` : ''}
          ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${q})) DESC
          LIMIT ${parsedPageSize}
        `
      } else {
        // No full-text query: sort by date
        events = await prisma.event.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            date: true,
            category: true,
            visibility: true,
            coverPhotoId: true,
            clubId: true,
          },
          orderBy: { date: 'desc' },
          take: parsedPageSize,
          skip: (parsedPage - 1) * parsedPageSize,
        })
      }

      // Search media (simplified — can enhance with tags filter)
      const mediaWhere: any = {
        event: whereClause,
      }

      if (tags && typeof tags === 'string') {
        const tagArray = tags.split(',').map((t) => t.trim())
        mediaWhere.tags = { hasSome: tagArray }
      }

      const media = await prisma.media.findMany({
        where: mediaWhere,
        select: {
          id: true,
          eventId: true,
          uploaderId: true,
          compressedUrl: true,
          thumbSmUrl: true,
          thumbMdUrl: true,
          mediaType: true,
          tags: true,
          uploadedAt: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: { uploadedAt: 'desc' },
        take: parsedPageSize,
      })

      const mediaDtos = media.map((m: any) => ({
        id: m.id,
        eventId: m.eventId,
        uploaderId: m.uploaderId,
        signedUrl: getMediaUrl(m.compressedUrl),
        thumbSmUrl: getMediaUrl(m.thumbSmUrl),
        thumbMdUrl: getMediaUrl(m.thumbMdUrl),
        mediaType: m.mediaType,
        tags: m.tags,
        likesCount: m._count.likes,
        commentsCount: m._count.comments,
        uploadedAt: m.uploadedAt.toISOString(),
      }))

      res.status(200).json({
        events,
        media: mediaDtos,
        total: events.length + media.length,
      })
    } catch (error) {
      next(error)
    }
  }
)

export default router
