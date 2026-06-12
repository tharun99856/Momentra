import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, ForbiddenError } from '@/lib/errors'
import { z } from 'zod'

const createEventSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['cultural', 'sports', 'workshop', 'trip', 'party', 'hackathon', 'other']),
  date: z.string().datetime(),
  location: z.string().optional(),
  visibility: z.enum(['public', 'private']),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const body = await request.json()
    const validated = createEventSchema.parse(body)

    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: params.id, userId: user.sub } },
    })
    if (!membership || (membership.role !== 'photographer' && membership.role !== 'admin')) {
      throw new ForbiddenError('Only photographers and admins can create events')
    }

    const event = await prisma.event.create({
      data: {
        clubId: params.id,
        name: validated.name,
        description: validated.description ?? null,
        category: validated.category,
        date: new Date(validated.date),
        location: validated.location ?? null,
        visibility: validated.visibility,
        createdBy: user.sub,
      },
    })
    return NextResponse.json(event, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const user = getAuthUser(request)
    const { searchParams } = request.nextUrl

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))
    const sort = searchParams.get('sort') ?? 'date_desc'

    const where: Record<string, unknown> = { clubId: params.id }

    if (!user) {
      where.visibility = 'public'
    } else {
      const membership = await prisma.clubMember.findUnique({
        where: { clubId_userId: { clubId: params.id, userId: user.sub } },
      })
      if (!membership) where.visibility = 'public'
    }

    const orderBy =
      sort === 'date_asc' ? { date: 'asc' as const }
      : sort === 'name_asc' ? { name: 'asc' as const }
      : { date: 'desc' as const }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { _count: { select: { media: true } } },
      }),
      prisma.event.count({ where }),
    ])

    return NextResponse.json({ data: events, total, page, pageSize, hasMore: page * pageSize < total })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
