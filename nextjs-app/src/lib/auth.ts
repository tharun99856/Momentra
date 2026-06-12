/**
 * Auth helpers used by API routes.
 * Mirrors auth.service.ts from the Express server.
 */
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from './prisma'
import { getKeyPair } from './keys'
import { AuthenticationError, ConflictError, ValidationError } from './errors'

const BCRYPT_COST = parseInt(process.env.BCRYPT_COST ?? '12', 10)
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

export interface JwtPayload {
  sub: string
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

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username may only contain alphanumeric characters and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

function toAuthUser(user: {
  id: string
  username: string
  email: string
  globalRole: string
  avatarUrl: string | null
}): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    globalRole: user.globalRole as 'admin' | 'user',
    avatarUrl: user.avatarUrl,
  }
}

function issueAccessToken(user: AuthUser): string {
  const { privateKey } = getKeyPair()
  const payload = { sub: user.id, email: user.email, globalRole: user.globalRole }
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: ACCESS_TOKEN_EXPIRY })
}

async function createRefreshToken(userId: string): Promise<string> {
  const tokenValue = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS)
  await prisma.refreshToken.create({ data: { userId, token: tokenValue, expiresAt } })
  return tokenValue
}

export async function register(dto: unknown): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(dto)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.errors[0]?.message ?? 'Validation failed')
  }
  const { username, email, password } = parsed.data

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } })
  if (existing) throw new ConflictError('A user with this email or username already exists')

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)
  const user = await prisma.user.create({ data: { username, email, passwordHash } })

  const authUser = toAuthUser(user)
  const accessToken = issueAccessToken(authUser)
  const refreshToken = await createRefreshToken(user.id)
  return { accessToken, refreshToken, user: authUser }
}

export async function login(dto: unknown): Promise<AuthResult> {
  const parsed = loginSchema.safeParse(dto)
  if (!parsed.success) throw new AuthenticationError('Invalid credentials')
  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    await bcrypt.compare(password, '$2b$12$invalidhashplaceholderXXXXXXXXXXXXXXXXXX')
    throw new AuthenticationError('Invalid credentials')
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash)
  if (!passwordValid) throw new AuthenticationError('Invalid credentials')

  const authUser = toAuthUser(user)
  const accessToken = issueAccessToken(authUser)
  const refreshToken = await createRefreshToken(user.id)
  return { accessToken, refreshToken, user: authUser }
}

export async function refresh(
  refreshTokenValue: string
): Promise<{ accessToken: string; user: AuthUser }> {
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenValue },
    include: { user: true },
  })
  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    throw new AuthenticationError('Invalid or expired refresh token')
  }
  const authUser = toAuthUser(tokenRecord.user)
  const accessToken = issueAccessToken(authUser)
  return { accessToken, user: authUser }
}

export async function logout(refreshTokenValue: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token: refreshTokenValue } })
}

export function verifyAccessToken(token: string): JwtPayload {
  const { publicKey } = getKeyPair()
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload
  } catch {
    throw new AuthenticationError('Invalid or expired access token')
  }
}

/**
 * Extract and verify the Bearer token from a Request's Authorization header.
 * Returns the payload or null if missing / invalid.
 */
export function getAuthUser(request: Request): JwtPayload | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    return verifyAccessToken(authHeader.slice(7))
  } catch {
    return null
  }
}

/**
 * Like getAuthUser but throws 401 if missing/invalid.
 */
export function requireAuthUser(request: Request): JwtPayload {
  const user = getAuthUser(request)
  if (!user) throw new AuthenticationError('Unauthenticated')
  return user
}
