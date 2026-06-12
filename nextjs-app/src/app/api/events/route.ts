import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError } from '@/lib/errors'
import { getMediaUrl } from '@/lib/storage'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = getAuthUser(request)
    const { searchParams } = request.nextUrl

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))
    const sort = searchParams.get('sort') ?? 'date_desc'
    const category = searchParams.getAll('category')
    const visibility = searchParams.get('visibility')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Record<string, unknown> = {}

    if (visibility && visibility !== 'all') {
      where.visibility = visibility
    } else if (!user) {
      where.visibility = 'public'
    } else {
      const memberships = await prisma.clubMember.findMany({
        where: { userId: user.sub },
        select: { clubId: true },
      })
      const clubIds = memberships.map((m) => m.clubId)
      where.OR = [{ visibility: 'public' }, { clubId: { in: clubIds } }]
    }

    if (category.length > 0) where.category = { in: category }
    if (from || to) {
      const dateFilter: Record<string, Date> = {}
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to)
      where.date = dateFilter
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
        include: {
          club: { select: { id: true, name: true } },
          _count: { select: { media: true } },
        },
      }),
      prisma.event.count({ where }),
    ])

    // Fetch cover photo URLs
    const coverPhotoIds = events.map((e) => e.coverPhotoId).filter(Boolean) as string[]
    const coverPhotos = new Map<string, string | null>()
    if (coverPhotoIds.length > 0) {
      const photos = await prisma.media.findMany({
        where: { id: { in: coverPhotoIds } },
        select: { id: true, thumbMdUrl: true },
      })
      for (const p of photos) {
        coverPhotos.set(p.id, getMediaUrl(p.thumbMdUrl))
      }
    }

    const data = events.map((event) => ({
      id: event.id,
      clubId: event.clubId,
      clubName: (event as any).club.name,
      name: event.name,
      description: event.description,
      category: event.category,
      date: event.date,
      location: event.location,
      visibility: event.visibility,
      coverPhotoUrl: event.coverPhotoId ? (coverPhotos.get(event.coverPhotoId) ?? null) : null,
      mediaCount: (event as any)._count.media,
    }))

    return NextResponse.json({ events: data, total, page, pageSize, hasMore: page * pageSize < total })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
