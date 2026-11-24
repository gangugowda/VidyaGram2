import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app'
import { openDatabase, selectAll, selectOne, type SqliteDatabase } from '../src/db/client'
import { migrate } from '../src/db/migrate'
import { seedDatabase } from '../src/db/seed'
import type { Quiz, User } from '@vidyagram/shared'

let app: FastifyInstance
let db: SqliteDatabase

const json = (res: { body: string }) => JSON.parse(res.body)
const cookieOf = (res: { cookies: Array<{ name: string; value: string }> }) =>
  res.cookies.find((cookie) => cookie.name === 'vg_session')?.value

async function login(identifier: string, password = 'demo1234') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { identifier, password },
  })
  expect(res.statusCode).toBe(200)
  const cookie = cookieOf(res)
  expect(cookie).toBeTruthy()
  return { cookie: cookie!, body: json(res) }
}

const as = (cookie: string) => ({ cookie: `vg_session=${cookie}` })

beforeAll(async () => {
  db = openDatabase(':memory:')
  migrate(db)
  await seedDatabase(db)
  app = await buildApp({ db, seed: false, logger: false, rateLimit: false })
})

afterAll(async () => {
  await app.close()
  db.close()
})

describe('health and public bootstrap', () => {
  it('reports health without authentication', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(json(res).data.status).toBe('ok')
  })

  it('exposes schools and demo accounts but no credentials', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/bootstrap' })
    expect(res.statusCode).toBe(200)
    const data = json(res).data
    expect(data.user).toBeNull()
    expect(data.db.schools.length).toBeGreaterThan(0)
    expect(data.demoAccounts.length).toBe(4)
    expect(data.db.users.length).toBe(4)
    expect(JSON.stringify(data)).not.toContain('passwordHash')
    expect(JSON.stringify(data)).not.toContain('password_hash')
    expect(data.db.marks).toEqual([])
    expect(data.db.notifications).toEqual([])
  })

  it('rejects a cross-site origin on unsafe methods', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { origin: 'https://evil.example' },
      payload: { identifier: 'aarav@vidyagram.demo', password: 'demo1234' },
    })
    expect(res.statusCode).toBe(403)
    expect(json(res).error.code).toBe('csrf_origin')
  })
})

describe('authentication', () => {
  it('signs in with a demo account and sets an httpOnly session cookie', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'aarav@vidyagram.demo', password: 'demo1234' },
    })
    expect(res.statusCode).toBe(200)
    const cookie = res.cookies.find((item) => item.name === 'vg_session')
    expect(cookie?.httpOnly).toBe(true)
    const body = json(res)
    expect(body.data.user.email).toBe('aarav@vidyagram.demo')
    expect(body.data.db.marks.every((mark: { studentId: string }) => mark.studentId === 'usr_aarav')).toBe(true)
    expect(JSON.stringify(body)).not.toContain('passwordHash')
  })

  it('rejects a wrong password without revealing whether the account exists', async () => {
    const wrong = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'aarav@vidyagram.demo', password: 'not-the-password' },
    })
    expect(wrong.statusCode).toBe(401)
    const unknown = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { identifier: 'nobody@vidyagram.demo', password: 'not-the-password' },
    })
    expect(unknown.statusCode).toBe(401)
    expect(json(wrong).error.message).toBe(json(unknown).error.message)
  })

  it('signs out and rejects the old session', async () => {
    const { cookie } = await login('meera@vidyagram.demo')
    const out = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: as(cookie) })
    expect(out.statusCode).toBe(200)
    const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: as(cookie) })
    expect(me.statusCode).toBe(401)
  })
})

describe('role scoping', () => {
  it('gives a student only their own private records', async () => {
    const { cookie } = await login('aarav@vidyagram.demo')
    const res = await app.inject({ method: 'GET', url: '/api/v1/bootstrap', headers: as(cookie) })
    const data = json(res).data
    expect(data.db.marks.every((mark: { studentId: string }) => mark.studentId === 'usr_aarav')).toBe(true)
    expect(data.db.attempts.every((attempt: { studentId: string }) => attempt.studentId === 'usr_aarav')).toBe(true)
    expect(data.db.notifications.every((n: { userId: string }) => n.userId === 'usr_aarav')).toBe(true)
    expect(data.db.downloads.every((d: { userId: string }) => d.userId === 'usr_aarav')).toBe(true)
    expect(data.db.audit).toEqual([])
  })

  it('does not let a student mark attendance', async () => {
    const { cookie } = await login('aarav@vidyagram.demo')
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/classes/cls_8a/attendance',
      headers: as(cookie),
      payload: {
        date: '2026-11-20',
        entries: [{ studentId: 'usr_aarav', status: 'present' }],
      },
    })
    expect(res.statusCode).toBe(403)
  })

  it('lets the class teacher save attendance and shows a student only their entry', async () => {
    const teacher = await login('meera@vidyagram.demo')
    const day = '2030-01-15'
    const save = await app.inject({
      method: 'PUT',
      url: '/api/v1/classes/cls_8a/attendance',
      headers: as(teacher.cookie),
      payload: {
        date: day,
        period: 'full-day',
        entries: [
          { studentId: 'usr_aarav', status: 'absent', note: 'Family function' },
          { studentId: 'usr_priya', status: 'present' },
        ],
      },
    })
    expect(save.statusCode).toBe(200)

    // A second save on the same slot must update, not duplicate, the day.
    const resave = await app.inject({
      method: 'PUT',
      url: '/api/v1/classes/cls_8a/attendance',
      headers: as(teacher.cookie),
      payload: { date: day, entries: [{ studentId: 'usr_aarav', status: 'absent' }] },
    })
    expect(resave.statusCode).toBe(200)

    const student = await login('aarav@vidyagram.demo')
    const read = await app.inject({
      method: 'GET',
      url: `/api/v1/classes/cls_8a/attendance?date=${day}`,
      headers: as(student.cookie),
    })
    expect(read.statusCode).toBe(200)
    const days = json(read).data.days
    expect(days).toHaveLength(1)
    expect(days[0].period).toBe('Full day')
    expect(days[0].entries).toEqual([expect.objectContaining({ studentId: 'usr_aarav', status: 'absent' })])
  })

  it('hides other students marks from a guardian without an approved link', async () => {
    const parent = await login('sunita@vidyagram.demo')
    const res = await app.inject({ method: 'GET', url: '/api/v1/bootstrap', headers: as(parent.cookie) })
    const data = json(res).data
    expect(data.db.marks.every((mark: { studentId: string }) => mark.studentId === 'usr_aarav')).toBe(true)
  })
})

describe('assessments and server-side grading', () => {
  it('publishes marks to the student', async () => {
    const teacher = await login('meera@vidyagram.demo')
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classes/cls_8a/assessments',
      headers: as(teacher.cookie),
      payload: { subjectId: 'math', title: 'API integration test', type: 'unit-test', date: '2026-11-21', maxMarks: 20 },
    })
    expect(created.statusCode).toBe(201)
    const assessmentId = json(created).data.assessment.id

    const saved = await app.inject({
      method: 'PUT',
      url: `/api/v1/assessments/${assessmentId}/marks`,
      headers: as(teacher.cookie),
      payload: { marks: [{ studentId: 'usr_aarav', marks: 18, remarks: 'Good work' }] },
    })
    expect(saved.statusCode).toBe(200)

    const published = await app.inject({
      method: 'POST',
      url: `/api/v1/assessments/${assessmentId}/publish`,
      headers: as(teacher.cookie),
    })
    expect(published.statusCode).toBe(200)

    const student = await login('aarav@vidyagram.demo')
    const res = await app.inject({ method: 'GET', url: '/api/v1/bootstrap', headers: as(student.cookie) })
    const marks = json(res).data.db.marks as Array<{ assessmentId: string; marks: number; grade: string }>
    const savedMark = marks.find((mark) => mark.assessmentId === assessmentId)
    // 18/20 is 90% → A2 on the shared grading scale.
    expect(savedMark).toMatchObject({ marks: 18, grade: 'A2' })
  })

  it('grades a quiz attempt on the server and enforces the attempt limit', async () => {
    const teacher = await login('meera@vidyagram.demo')
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/classes/cls_8a/quizzes',
      headers: as(teacher.cookie),
      payload: {
        subjectId: 'math',
        title: 'Server grading check',
        instructions: 'One attempt only.',
        showResults: 'manual',
        showAnswers: true,
        attemptsAllowed: 1,
        timeLimitMin: 10,
        language: 'en',
        questions: [
          { id: 'q1', type: 'mcq', prompt: '1/2 + 1/2 = ?', options: ['1', '2', '1/4'], answer: '1', explanation: 'Two halves make one.', points: 5 },
          { id: 'q2', type: 'fill', prompt: 'Write 0.5 as a fraction.', answer: '1/2', accept: ['2/4'], explanation: '0.5 is one half.', points: 5 },
        ],
      },
    })
    expect(created.statusCode).toBe(201)
    const quizId = json(created).data.quiz.id

    const published = await app.inject({
      method: 'POST',
      url: `/api/v1/quizzes/${quizId}/publish`,
      headers: as(teacher.cookie),
    })
    expect(published.statusCode).toBe(200)

    const student = await login('aarav@vidyagram.demo')
    const attempt = await app.inject({
      method: 'POST',
      url: `/api/v1/quizzes/${quizId}/attempts`,
      headers: as(student.cookie),
      payload: { answers: { q1: '1', q2: '1/2' } },
    })
    expect(attempt.statusCode).toBe(201)
    expect(json(attempt).data.attempt).toMatchObject({ score: 10, maxScore: 10, autoGraded: true })

    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/quizzes/${quizId}/attempts`,
      headers: as(student.cookie),
      payload: { answers: { q1: '1', q2: '1/2' } },
    })
    expect(second.statusCode).toBe(409)

    // The answer key stays hidden while results are withheld.
    const boot = await app.inject({ method: 'GET', url: '/api/v1/bootstrap', headers: as(student.cookie) })
    const quiz = (json(boot).data.db.quizzes as Quiz[]).find((item) => item.id === quizId)
    expect(quiz?.questions[0].answer).toBe('')
    expect(quiz?.questions[0].explanation).toBe('')
  })
})

describe('guardian links and admin safety', () => {
  it('requires administrator approval before a guardian sees a child', async () => {
    const email = `guardian-${Date.now()}@example.test`
    const signup = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/signup',
      payload: {
        role: 'parent',
        name: 'Test Guardian',
        email,
        password: 'strong-password-1',
        language: 'en',
        schoolId: 'sch_ghs_rampur',
        consentGiven: true,
        relationship: 'Guardian',
      },
    })
    expect(signup.statusCode).toBe(201)
    const parentCookie = cookieOf(signup)!

    const requested = await app.inject({
      method: 'POST',
      url: '/api/v1/parent-links/request',
      headers: as(parentCookie),
      payload: { method: 'approval', studentEmail: 'priya@vidyagram.demo', note: 'Mother' },
    })
    expect(requested.statusCode).toBe(201)
    const linkId = json(requested).data.link.id

    const before = await app.inject({ method: 'GET', url: '/api/v1/bootstrap', headers: as(parentCookie) })
    expect(json(before).data.db.marks).toEqual([])

    const admin = await login('rakesh@vidyagram.demo')
    const approved = await app.inject({
      method: 'POST',
      url: `/api/v1/parent-links/${linkId}/approve`,
      headers: as(admin.cookie),
    })
    expect(approved.statusCode).toBe(200)

    const after = await app.inject({ method: 'GET', url: '/api/v1/bootstrap', headers: as(parentCookie) })
    const marks = json(after).data.db.marks as Array<{ studentId: string }>
    expect(marks.length).toBeGreaterThan(0)
    expect(marks.every((mark) => mark.studentId === 'usr_priya')).toBe(true)
  })

  it('stops an administrator from disabling their own account', async () => {
    const admin = await login('rakesh@vidyagram.demo')
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/users/usr_rakesh',
      headers: as(admin.cookie),
      payload: { disabled: true },
    })
    expect(res.statusCode).toBe(409)
  })

  it('rejects a student from the admin user list', async () => {
    const student = await login('aarav@vidyagram.demo')
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/users', headers: as(student.cookie) })
    expect(res.statusCode).toBe(403)
  })
})
