interface KeyPair {
  privateKey: string
  publicKey: string
}

let cachedKeys: KeyPair | null = null

export function getKeyPair(): KeyPair {
  if (cachedKeys) return cachedKeys

  const privateKeyB64 = process.env.JWT_PRIVATE_KEY
  const publicKeyB64 = process.env.JWT_PUBLIC_KEY

  if (!privateKeyB64) {
    throw new Error('JWT_PRIVATE_KEY environment variable is not set')
  }
  if (!publicKeyB64) {
    throw new Error('JWT_PUBLIC_KEY environment variable is not set')
  }

  const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf-8')
  const publicKey = Buffer.from(publicKeyB64, 'base64').toString('utf-8')

  cachedKeys = { privateKey, publicKey }
  return cachedKeys
}
