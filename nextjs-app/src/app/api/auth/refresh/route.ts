import { NextRequest, NextResponse } from 'next/server'
import { refresh } from '@/lib/auth'
import { toApiError } from '@/lib/errors'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value
    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token provided' }, { status: 401 })
    }
    const result = await refresh(refreshToken)
    return NextResponse.json({ accessToken: result.accessToken, user: result.user })
  } catch (err) {
    const response = NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
    response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' })
    return response
  }
}
