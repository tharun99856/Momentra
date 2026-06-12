import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError, NotFoundError, ForbiddenError } from '@/lib/errors'
import { z } from 'zod'

const updateClubSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    requireAuthUser(request)
    const club = await prisma.club.findUnique({ where: { id: params.id } })
    if (!club) throw new NotFoundError('Club not found')
    return NextResponse.json(club)
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
    const validated = updateClubSchema.parse(body)

    const membership = await prisma.clubMember.findUnique({
      where: { clubId_userId: { clubId: params.id, userId: user.sub } },
    })
    if (!membership || membership.role !== 'admin') {
      throw new ForbiddenError('Only club admins can update club details')
    }

    const club = await prisma.club.update({
      where: { id: params.id },
      data: {
        ...(validated.name !== undefined && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.logoUrl !== undefined && { logoUrl: validated.logoUrl }),
      },
    })
    return NextResponse.json(club)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
