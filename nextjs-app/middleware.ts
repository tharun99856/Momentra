import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require a session (refresh token cookie present)
const PROTECTED = ['/dashboard', '/settings', '/upload', '/my-photos', '/favourites', '/profile', '/search', '/events']
// Routes only for guests
const GUEST_ONLY = ['/login', '/register']

function matchesProtected(pathname: string): boolean {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

function matchesGuestOnly(pathname: string): boolean {
  return GUEST_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl

  // Skip Next.js internals, static files, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // We use the refresh token cookie as the session signal.
  // The actual token verification happens inside API routes with full Node.js crypto.
  const hasSession = !!request.cookies.get('refreshToken')?.value

  if (matchesProtected(pathname) && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  if (matchesGuestOnly(pathname) && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
