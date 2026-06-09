// Event service implementation

import { prisma } from '../lib/prisma.js'
import { BadRequestError, ForbiddenError, NotFoundError } from '../lib/errors.js'
import type {
  CreateEventDto,
  UpdateEventDto,
  EventQuery,
  Event,
  EventSummary,
  ViewerContext,
  PaginatedResult,
} from '../types/event.types.js'
import { z } from 'zod'

// Validation schemas
const createEventSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['cultural', 'sports', 'workshop', 'trip', 'party', 'hackathon', 'other']),
  date: z.string().datetime(),
  location: z.string().optional(),
  visibility: z.enum(['public', 'private']),
})

const updateEventSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(['cultural', 'sports', 'workshop', 'trip', 'party', 'hackathon', 'other']).optional(),
  date: z.string().datetime().optional(),
  location: z.string().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  coverPhotoId: z.string().uuid().optional(),
})

export class EventService {
  /**
   * Create a new event (photographer or admin only)
   */
  async create(dto: CreateEventDto, creatorId: string, clubId: string): Promise<Event> {
    const validated = createEventSchema.parse(dto)

    const event = await prisma.event.create({
      data: {
        clubId,
        name: validated.name,
        description: validated.description ?? null,
        category: validated.category,
        date: new Date(validated.date),
        location: validated.location ?? null,
        visibility: validated.visibility,
        createdBy: creatorId,
      },
    })

    return event
  }

  /**
   * Find many events with filters and pagination
   */
  async findMany(
    query: EventQuery,
    viewer: ViewerContext,
    clubId: string
  ): Promise<PaginatedResult<EventSummary>> {
    const page = Math.max(1, query.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20))
    const skip = (page - 1) * pageSize

    // Build where clause
    const where: any = { clubId }

    // Visibility filter
    if (query.visibility) {
      where.visibility = query.visibility
    } else if (viewer.userId) {
      // Include public events + private events where user is a member
      const userClubIds = Object.keys(viewer.clubMemberships)
      where.OR = [
        { visibility: 'public' },
        {
          AND: [
            { visibility: 'private' },
            { clubId: { in: userClubIds } },
          ],
        },
      ]
    } else {
      // Anonymous users see only public events
      where.visibility = 'public'
    }

    // Category filter
    if (query.category && query.category.length > 0) {
      where.category = { in: query.category }
    }

    // Date range filter
    if (query.from || query.to) {
      where.date = {}
      if (query.from) {
        where.date.gte = new Date(query.from)
      }
      if (query.to) {
        where.date.lte = new Date(query.to)
      }
    }

    // Build orderBy
    const orderBy: any = []
    switch (query.sort) {
      case 'date_asc':
        orderBy.push({ date: 'asc' })
        break
      case 'name_asc':
        orderBy.push({ name: 'asc' })
        break
      case 'date_desc':
      default:
        orderBy.push({ date: 'desc' })
    }

    // Execute query
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          _count: {
            select: { media: true },
          },
        },
      }),
      prisma.event.count({ where }),
    ])

    // Map to EventSummary
    const data: EventSummary[] = events.map((event) => ({
      id: event.id,
      clubId: event.clubId,
      name: event.name,
      category: event.category as any,
      date: event.date,
      visibility: event.visibility as any,
      coverPhotoUrl: null, // TODO: Add signed CloudFront URL in later task
      photoCount: event._count.media,
    }))

    return {
      data,
      total,
      page,
      pageSize,
      hasMore: skip + pageSize < total,
    }
  }

  /**
   * Find event by ID
   */
  async findById(id: string, viewer: ViewerContext): Promise<any> {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        club: { select: { id: true, name: true } },
        _count: { select: { media: true } },
      },
    })

    if (!event) {
      throw new NotFoundError('Event not found')
    }

    // Check access for private events
    if (event.visibility === 'private') {
      const hasAccess = viewer.clubMemberships[event.clubId] !== undefined
      if (!hasAccess) {
        throw new ForbiddenError('Access denied to this event')
      }
    }

    return event
  }

  /**
   * Update event (creator or club admin only)
   */
  async update(id: string, dto: UpdateEventDto, actorId: string): Promise<Event> {
    const validated = updateEventSchema.parse(dto)

    const event = await prisma.event.findUnique({
      where: { id },
    })

    if (!event) {
      throw new NotFoundError('Event not found')
    }

    // Check if actor is creator or club admin
    const membership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: event.clubId,
          userId: actorId,
        },
      },
    })

    const isCreator = event.createdBy === actorId
    const isAdmin = membership?.role === 'admin'

    if (!isCreator && !isAdmin) {
      throw new ForbiddenError('Only event creator or club admin can update this event')
    }

    // If coverPhotoId is provided, validate it belongs to this event
    if (validated.coverPhotoId) {
      const media = await prisma.media.findUnique({
        where: { id: validated.coverPhotoId },
      })

      if (!media || media.eventId !== id) {
        throw new BadRequestError('Cover photo must belong to this event')
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.category !== undefined && { category: validated.category }),
        ...(validated.date !== undefined && { date: new Date(validated.date) }),
        ...(validated.location !== undefined && { location: validated.location }),
        ...(validated.visibility !== undefined && { visibility: validated.visibility }),
        ...(validated.coverPhotoId !== undefined && { coverPhotoId: validated.coverPhotoId }),
      },
    })

    return updatedEvent
  }

  /**
   * Delete event (creator or club admin only)
   */
  async delete(id: string, actorId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id },
    })

    if (!event) {
      throw new NotFoundError('Event not found')
    }

    // Check if actor is creator or club admin
    const membership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId: event.clubId,
          userId: actorId,
        },
      },
    })

    const isCreator = event.createdBy === actorId
    const isAdmin = membership?.role === 'admin'

    if (!isCreator && !isAdmin) {
      throw new ForbiddenError('Only event creator or club admin can delete this event')
    }

    // Delete event (cascades to media via Prisma schema)
    await prisma.event.delete({
      where: { id },
    })

    // TODO: Enqueue S3 cleanup job for media files (Task 11)
  }
}

export const eventService = new EventService()
