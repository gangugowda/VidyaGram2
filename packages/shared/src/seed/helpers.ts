import { addDays, todayISO } from '../utils'

/** Date `offset` days from today, as YYYY-MM-DD. */
export const iso = (offset: number): string => addDays(todayISO(), offset)

/** ISO timestamp `daysAgo` days ago at a given local hour. */
export const stamp = (daysAgo: number, hour = 9, minute = 15): string => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const stampAt = (offsetDays: number, hour = 9): string => stamp(-offsetDays, hour, 0)

/** Last N school days (Sundays excluded), oldest first. */
export const schoolDays = (n: number): string[] => {
  const out: string[] = []
  let cursor = 1
  while (out.length < n) {
    const d = new Date()
    d.setDate(d.getDate() - cursor)
    if (d.getDay() !== 0) out.push(addDays(todayISO(), -cursor))
    cursor += 1
  }
  return out.reverse()
}
