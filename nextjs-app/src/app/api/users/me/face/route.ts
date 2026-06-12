import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError } from '@/lib/errors'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const descriptor = Array.from({ length: 128 }, () => Math.random())
    await prisma.user.update({ where: { id: user.sub }, data: { faceDescriptor: descriptor } })
    return NextResponse.json({ success: true })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    await prisma.user.update({ where: { id: user.sub }, data: { faceDescriptor: [] } })
    return NextResponse.json({ success: true })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
