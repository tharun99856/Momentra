import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError } from '@/lib/errors'
import { getMediaUrl } from '@/lib/storage'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = getAuthUser(request)
    const { searchParams } = request.nextUrl

    const q = searchParams.get('q')
    const tags = searchParams.get('tags')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const category = searchParams.get('category')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))

    if (q && q.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    // Build visibility filter
    const visibilityWhere: Record<string, unknown> = {}
    if (user) {
      const memberships = await prisma.clubMember.findMany({
        where: { userId: user.sub },
        select: { clubId: true },
      })
      const clubIds = memberships.map((m) => m.clubId)
      visibilityWhere.OR = [{ visibility: 'public' }, { clubId: { in: clubIds } }]
    } else {
      visibilityWhere.visibility = 'public'
    }

    if (category) visibilityWhere.category = category
    if (from || to) {
      const dateFilter: Record<string, Date> = {}
      if (from) dateFilter.gte = new Date(from)
      if (to) dateFilter.lte = new Date(to)
      visibilityWhere.date = dateFilter
    }

    // Search events
    let events: unknown[] = []
    if (q) {
      events = await prisma.event.findMany({
        where: {
          ...visibilityWhere,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, date: true, category: true, visibility: true, coverPhotoId: true, clubId: true },
        orderBy: { date: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      })
    } else {
      events = await prisma.event.findMany({
        where: visibilityWhere,
        select: { id: true, name: true, date: true, category: true, visibility: true, coverPhotoId: true, clubId: true },
        orderBy: { date: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      })
    }

    // Search media
    const mediaWhere: Record<string, unknown> = { event: visibilityWhere }
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean)
      if (tagArray.length > 0) mediaWhere.tags = { hasSome: tagArray }
    }
    if (q) {
      (mediaWhere as any).OR = [
        { tags: { has: q } },
        { caption: { contains: q, mode: 'insensitive' } },
      ]
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
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { uploadedAt: 'desc' },
      take: pageSize,
    })

    const mediaDtos = media.map((m) => ({
      id: m.id,
      eventId: m.eventId,
      uploaderId: m.uploaderId,
      signedUrl: getMediaUrl(m.compressedUrl),
      thumbSmUrl: getMediaUrl(m.thumbSmUrl),
      thumbMdUrl: getMediaUrl(m.thumbMdUrl),
      mediaType: m.mediaType,
      tags: m.tags,
      likesCount: (m as any)._count.likes,
      commentsCount: (m as any)._count.comments,
      uploadedAt: m.uploadedAt.toISOString(),
    }))

    return NextResponse.json({ events, media: mediaDtos, total: events.length + media.length })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
