import type { SafeUser } from '@vidyagram/shared'
import type { User } from '@vidyagram/shared'

/** Remove credential material before a user record leaves the server. */
export function toSafeUser(user: User): SafeUser {
  const copy = { ...user } as User & { passwordAlgo?: string }
  delete (copy as { passwordHash?: string }).passwordHash
  delete (copy as { salt?: string }).salt
  delete copy.passwordAlgo
  return copy
}

export const toSafeUsers = (users: User[]): SafeUser[] => users.map(toSafeUser)
