import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, NotFoundError, ForbiddenError, BadRequestError } from '@/lib/errors'
import { z } from 'zod'

const updateEventSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  category: z.enum(['cultural', 'sports', 'workshop', 'trip', 'party', 'hackathon', 'other']).optional(),
  date: z.string().datetime().optional(),
  location: z.string().optional(),
  visibility: z.enum(['public', 'private']).optional(),
  coverPhotoId: z.string().uuid().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = getAuthUser(request)

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        club: { select: { id: true, name: true } },
        _count: { select: { media: true } },
      },
    })
    if (!event) throw new NotFoundError('Event not found')

    if (event.visibility === 'private') {
      if (!user) throw new ForbiddenError('Access denied to this event')
      const membership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: event.clubId, userId: user.sub } },
      })
      if (!membership) throw new ForbiddenError('Access denied to this event')
    }

    return NextResponse.json(event)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const body = await request.json()
    const validated = updateEventSchema.parse(body)

    const event = await prisma.event.findUnique({ where: { id: params.id } })
    if (!event) throw new NotFoundError('Event not found')

    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: event.clubId, userId: user.sub } },
    })
    const isCreator = event.createdBy === user.sub
    const isAdmin = membership?.role === 'admin'
    if (!isCreator && !isAdmin) {
      throw new ForbiddenError('Only event creator or club admin can update this event')
    }

    if (validated.coverPhotoId) {
      const media = await prisma.media.findUnique({ where: { id: validated.coverPhotoId } })
      if (!media || media.eventId !== params.id) {
        throw new BadRequestError('Cover photo must belong to this event')
      }
    }

    const updated = await prisma.event.update({
      where: { id: params.id },
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
    return NextResponse.json(updated)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)

    const event = await prisma.event.findUnique({ where: { id: params.id } })
    if (!event) throw new NotFoundError('Event not found')

    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: event.clubId, userId: user.sub } },
    })
    if (event.createdBy !== user.sub && membership?.role !== 'admin') {
      throw new ForbiddenError('Only event creator or club admin can delete this event')
    }

    await prisma.event.delete({ where: { id: params.id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
