/**
 * Generates an RS256 key pair and writes them as base64 to .env.local
 * Usage: node scripts/generate-keys.mjs
 */
import { generateKeyPairSync } from 'crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

const privB64 = Buffer.from(privateKey).toString('base64')
const pubB64 = Buffer.from(publicKey).toString('base64')

const envPath = join(root, '.env.local')
let existing = ''
if (existsSync(envPath)) {
  existing = readFileSync(envPath, 'utf8')
  // Remove old key lines
  existing = existing.replace(/^JWT_PRIVATE_KEY=.*$/m, '').replace(/^JWT_PUBLIC_KEY=.*$/m, '')
}

const newEnv = `${existing.trim()}\nJWT_PRIVATE_KEY=${privB64}\nJWT_PUBLIC_KEY=${pubB64}\n`
writeFileSync(envPath, newEnv)

console.log('✓ JWT keys written to .env.local')
console.log('  JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are set.')
