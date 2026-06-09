export interface JwtPayload {
  sub: string        // user UUID
  email: string
  globalRole: 'admin' | 'user'
  iat: number
  exp: number
}

export interface AuthUser {
  id: string
  username: string
  email: string
  globalRole: 'admin' | 'user'
  avatarUrl: string | null
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
