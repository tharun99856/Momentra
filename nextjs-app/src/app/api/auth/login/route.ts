import { NextRequest, NextResponse } from 'next/server'
import { login } from '@/lib/auth'
import { toApiError } from '@/lib/errors'

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
    const result = await login(body)

    const response = NextResponse.json(
      { accessToken: result.accessToken, user: result.user },
      { status: 200 }
    )
    response.cookies.set('refreshToken', result.refreshToken, COOKIE_OPTIONS)
    return response
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
