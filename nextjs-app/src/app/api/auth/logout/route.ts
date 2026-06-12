import { NextRequest, NextResponse } from 'next/server'
import { logout } from '@/lib/auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value
    if (refreshToken) {
      await logout(refreshToken)
    }
    const response = NextResponse.json({ message: 'Logged out successfully' })
    response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' })
    return response
  } catch {
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    response.cookies.set('refreshToken', '', { maxAge: 0, path: '/' })
    return response
  }
}
