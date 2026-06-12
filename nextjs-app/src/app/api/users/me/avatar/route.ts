import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toApiError } from '@/lib/errors'
import { uploadFile, getMediaUrl } from '@/lib/storage'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireAuthUser(request)
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Avatar must be under 5 MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const key = `avatars/${user.sub}.jpg`
    const avatarUrl = await uploadFile(key, buffer, file.type)

    const updated = await prisma.user.update({
      where: { id: user.sub },
      data: { avatarUrl },
      select: { id: true, username: true, email: true, avatarUrl: true },
    })

    return NextResponse.json({ ...updated, avatarUrl: getMediaUrl(updated.avatarUrl) })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
