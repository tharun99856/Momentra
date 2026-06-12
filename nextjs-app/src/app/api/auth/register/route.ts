import { NextRequest, NextResponse } from 'next/server'
import { register } from '@/lib/auth'
import { toApiError, ValidationError, ConflictError } from '@/lib/errors'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60,
  path: '/',
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const result = await register(body)

    const response = NextResponse.json(
      { accessToken: result.accessToken, user: result.user },
      { status: 201 }
    )
    response.cookies.set('refreshToken', result.refreshToken, COOKIE_OPTIONS)
    return response
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
