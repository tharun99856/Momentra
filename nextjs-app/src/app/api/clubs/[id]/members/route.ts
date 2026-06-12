import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/errors'
import { z } from 'zod'

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'photographer', 'member']),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    requireAuthUser(request)
    const members = await prisma.clubMember.findMany({
      where: { clubId: params.id },
      include: {
        user: { select: { id: true, username: true, email: true, avatarUrl: true } },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    })
    return NextResponse.json(members)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const actor = requireAuthUser(request)
    const body = await request.json()
    const validated = addMemberSchema.parse(body)

    const actorMembership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: params.id, userId: actor.sub } },
    })
    if (!actorMembership || actorMembership.role !== 'admin') {
      throw new ForbiddenError('Only club admins can add members')
    }

    const targetUser = await prisma.user.findUnique({ where: { id: validated.userId } })
    if (!targetUser) throw new NotFoundError('User not found')

    const existing = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: params.id, userId: validated.userId } },
    })
    if (existing) throw new BadRequestError('User is already a member of this club')

    const member = await prisma.clubMember.create({
      data: { clubId: params.id, userId: validated.userId, role: validated.role },
    })
    return NextResponse.json(member, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
