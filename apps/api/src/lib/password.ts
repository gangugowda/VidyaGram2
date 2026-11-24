import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>

/**
 * Password hashing for real accounts.
 *
 * scrypt is memory-hard and available in Node without a native dependency.
 * Parameters follow OWASP's 2024 guidance for scrypt (N=2^14, r=8, p=1) and
 * produce a 64-byte key. Hashes are stored as hex with the algorithm and
 * parameters recorded so they can be upgraded later without locking users out.
 */
export const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 } as const
export const PASSWORD_ALGO = 'scrypt$16384$8$1'

export function newSalt(bytes = 16): string {
  return randomBytes(bytes).toString('hex')
}

export async function hashPassword(password: string, salt = newSalt()): Promise<{ hash: string; salt: string }> {
  const derived = (await scrypt(password, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    maxmem: 64 * 1024 * 1024,
  })) as Buffer
  return { hash: derived.toString('hex'), salt }
}

export async function verifyPassword(password: string, hash: string, salt: string, algo?: string | null): Promise<boolean> {
  // Only scrypt is accepted. The browser demo used a weak SHA-256 hash; those
  // records never reach the server, so there is no legacy path to support.
  if (algo && !algo.startsWith('scrypt$')) return false
  const derived = (await scrypt(password, salt, SCRYPT_PARAMS.keylen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    maxmem: 64 * 1024 * 1024,
  })) as Buffer
  const expected = Buffer.from(hash, 'hex')
  if (expected.length !== derived.length) return false
  return timingSafeEqual(expected, derived)
}
