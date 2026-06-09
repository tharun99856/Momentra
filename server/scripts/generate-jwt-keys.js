import { generateKeyPairSync } from 'crypto'

// Generate RS256 key pair
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
})

// Base64 encode for .env storage
const privateKeyB64 = Buffer.from(privateKey).toString('base64')
const publicKeyB64 = Buffer.from(publicKey).toString('base64')

console.log('Add these to your .env file:\n')
console.log(`JWT_PRIVATE_KEY=${privateKeyB64}`)
console.log(`JWT_PUBLIC_KEY=${publicKeyB64}`)
