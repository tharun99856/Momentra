import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, NotFoundError } from '@/lib/errors'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        username: true,
        email: true,
        globalRole: true,
        avatarUrl: true,
        faceDescriptor: true,
        createdAt: true,
        _count: { select: { clubMemberships: true, uploadedMedia: true } },
      },
    })
    if (!dbUser) throw new NotFoundError('User not found')

    return NextResponse.json({
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      globalRole: dbUser.globalRole,
      avatarUrl: dbUser.avatarUrl,
      hasFaceDescriptor: dbUser.faceDescriptor.length > 0,
      clubCount: (dbUser as any)._count.clubMemberships,
      uploadCount: (dbUser as any)._count.uploadedMedia,
      createdAt: dbUser.createdAt,
    })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const { username, email } = await request.json() as { username?: string; email?: string }
    const data: Record<string, string> = {}
    if (username) data.username = username
    if (email) data.email = email

    const updated = await prisma.user.update({
      where: { id: user.sub },
      data,
      select: { id: true, username: true, email: true, globalRole: true, avatarUrl: true },
    })
    return NextResponse.json(updated)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
