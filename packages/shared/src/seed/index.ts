import type { DB } from '../types'
import { makeBase, type SeedOptions } from './base'
import { ATTEMPTS, QUIZZES, RECORDINGS, RESOURCES, SESSIONS } from './content'
import { ASSESSMENTS, ATTENDANCE, LAB_RUNS, MARKS } from './academic'
import {
  ANNOUNCEMENTS,
  AUDIT,
  BOOKMARKS,
  buildActivity,
  DOUBTS,
  DOWNLOADS,
  FEEDBACK,
  LABS,
  NOTIFICATIONS,
  PARENT_LINKS,
  SCHOLARSHIPS,
  USER_BADGES,
} from './community'

export const DB_VERSION = 4

export const SEED_STORAGE_KEY = 'vidyagram.db.v4'

/** Demo credentials and school ids, re-exported so the web app has one import. */
export { DEMO_PASSWORD, SCHOOL_ONE, SCHOOL_TWO } from './base'
export type { SeedOptions } from './base'
export { BADGES } from './community'

/** Builds a fresh, internally consistent sample dataset relative to today. */
export async function buildSeed(options: SeedOptions = {}): Promise<DB> {
  const base = await makeBase(options)
  return {
    version: DB_VERSION,
    seededAt: new Date().toISOString(),
    ...base,
    sessions: SESSIONS,
    recordings: RECORDINGS,
    resources: RESOURCES,
    quizzes: QUIZZES,
    attempts: ATTEMPTS,
    attendance: ATTENDANCE,
    assessments: ASSESSMENTS,
    marks: MARKS,
    doubts: DOUBTS,
    announcements: ANNOUNCEMENTS,
    notifications: NOTIFICATIONS,
    scholarships: SCHOLARSHIPS,
    labs: LABS,
    labRuns: LAB_RUNS,
    feedback: FEEDBACK,
    downloads: DOWNLOADS,
    parentLinks: PARENT_LINKS,
    userBadges: USER_BADGES,
    leaderboardOptOut: [],
    bookmarks: BOOKMARKS,
    outbox: [],
    activity: buildActivity(),
    audit: AUDIT,
  }
}
