import type { DB, Role, User } from './types'

/** Demo accounts surfaced on the sign-in screen (sample data only). */
export const publicDemoAccounts = (db: DB): User[] => {
  const order: Record<Role, number> = { student: 0, teacher: 1, parent: 2, admin: 3 }
  return db.users
    .filter((u) => u.demo && ['usr_aarav', 'usr_meera', 'usr_sunita', 'usr_rakesh'].includes(u.id))
    .sort((a, b) => order[a.role] - order[b.role])
}
