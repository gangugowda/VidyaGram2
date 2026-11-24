import { z } from 'zod'
import type { FastifyInstance } from 'fastify'
import type { Announcement, Doubt, DoubtReply, FeedbackItem, User } from '@vidyagram/shared'
import type { SqliteDatabase } from '../db/client'
import { selectAll, selectOne, updateRow, upsert } from '../db/client'
import { canManageClass, canViewClass, classRosterIds } from '../lib/access'
import { recordAudit } from '../lib/audit'
import { forbidden, notFound, ok, parse } from '../lib/http'
import { newId } from '../lib/ids'
import { notifyGuardians, notifyUser } from '../lib/notify'
import { requireAuth, requireRole } from '../lib/auth'

const idSchema = z.object({ id: z.string().min(1).max(100) })

const doubtSchema = z.object({
  classId: z.string().min(1).max(100),
  subjectId: z.string().min(1).max(40),
  topic: z.string().trim().min(3).max(160),
  question: z.string().trim().min(10).max(4000),
  attachmentName: z.string().max(200).optional(),
})

const replySchema = z.object({
  body: z.string().trim().min(1).max(4000),
  aiGenerated: z.boolean().optional(),
})

const announcementSchema = z.object({
  classId: z.string().min(1).max(100).optional(),
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(4000),
  audience: z.enum(['students', 'parents', 'all']).default('all'),
})

const feedbackSchema = z.object({
  category: z.enum(['learning-content', 'technical', 'suggestion', 'general']),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
})

const feedbackPatchSchema = z.object({
  status: z.enum(['new', 'reviewing', 'resolved']).optional(),
  adminReply: z.string().trim().max(4000).optional(),
})

const isEnrolled = (db: SqliteDatabase, classId: string, studentId: string): boolean =>
  !!db
    .prepare('SELECT 1 FROM enrollments WHERE class_id = ? AND student_id = ? AND status = ?')
    .get(classId, studentId, 'active')

export function registerCommunityRoutes(app: FastifyInstance, db: SqliteDatabase): void {
  /* ------------------------------------------------------------------ doubts */

  app.post('/doubts', { preHandler: [requireAuth(db), requireRole('student')] }, async (request, reply) => {
    const auth = request.auth!
    const input = parse(doubtSchema, request.body)
    if (!isEnrolled(db, input.classId, auth.user.id)) throw forbidden('You are not enrolled in that class.')
    const doubt: Doubt = {
      id: newId('doubt'),
      studentId: auth.user.id,
      classId: input.classId,
      subjectId: input.subjectId,
      topic: input.topic,
      question: input.question,
      attachmentName: input.attachmentName,
      status: 'open',
      createdAt: new Date().toISOString(),
      replies: [],
    }
    upsert(db, 'doubts', doubt)
    const cls = selectOne<{ teacherId: string }>(db, 'classes', { id: input.classId })
    if (cls) notifyUser(db, cls.teacherId, 'doubt', 'New doubt', doubt.topic, '/doubts')
    recordAudit(db, auth.user, 'doubt.create', doubt.topic)
    return ok(reply, { doubt }, 201)
  })

  app.post('/doubts/:id/replies', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const { id } = parse(idSchema, request.params)
    const doubt = selectOne<Doubt>(db, 'doubts', { id })
    if (!doubt) throw notFound('Doubt not found.')
    const canReply =
      auth.user.role === 'admin' || (auth.user.role === 'teacher' && canManageClass(db, auth.user, doubt.classId))
    if (!canReply) throw forbidden('Only the class teacher can reply to this doubt.')
    const input = parse(replySchema, request.body)
    const doubtReply: DoubtReply = {
      id: newId('reply'),
      authorId: auth.user.id,
      authorRole: auth.user.role,
      body: input.body,
      aiGenerated: input.aiGenerated,
      createdAt: new Date().toISOString(),
    }
    updateRow(db, 'doubts', id, { replies: [...doubt.replies, doubtReply] })
    notifyUser(db, doubt.studentId, 'doubt', 'Your doubt has a reply', input.body.slice(0, 120), '/doubts')
    recordAudit(db, auth.user, 'doubt.reply', doubt.topic)
    return ok(reply, { doubt: selectOne<Doubt>(db, 'doubts', { id }) }, 201)
  })

  app.patch('/doubts/:id/resolve', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const { id } = parse(idSchema, request.params)
    const doubt = selectOne<Doubt>(db, 'doubts', { id })
    if (!doubt) throw notFound('Doubt not found.')
    const allowed =
      doubt.studentId === auth.user.id ||
      auth.user.role === 'admin' ||
      (auth.user.role === 'teacher' && canManageClass(db, auth.user, doubt.classId))
    if (!allowed) throw forbidden()
    updateRow(db, 'doubts', id, { status: 'resolved', resolvedAt: new Date().toISOString() })
    return ok(reply, { doubt: selectOne<Doubt>(db, 'doubts', { id }) })
  })

  /* ----------------------------------------------------------- announcements */

  app.post(
    '/announcements',
    { preHandler: [requireAuth(db), requireRole('teacher', 'admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const input = parse(announcementSchema, request.body)
      if (input.classId && !canManageClass(db, auth.user, input.classId)) {
        throw forbidden('You can only announce to classes you teach.')
      }
      const announcement: Announcement = {
        id: newId('ann'),
        classId: input.classId,
        schoolId: auth.user.schoolId,
        title: input.title,
        body: input.body,
        authorId: auth.user.id,
        audience: input.audience,
        createdAt: new Date().toISOString(),
      }
      upsert(db, 'announcements', announcement)

      const studentIds = input.classId
        ? classRosterIds(db, input.classId)
        : selectAll<User>(db, 'users', { where: { role: 'student', schoolId: auth.user.schoolId } }).map((u) => u.id)
      if (input.audience === 'students' || input.audience === 'all') {
        for (const studentId of studentIds) {
          notifyUser(db, studentId, 'announcement', announcement.title, announcement.body.slice(0, 160), '/notifications')
        }
      }
      if (input.audience === 'parents' || input.audience === 'all') {
        for (const studentId of studentIds) {
          notifyGuardians(db, studentId, 'announcement', announcement.title, announcement.body.slice(0, 160), '/notifications')
        }
      }
      recordAudit(db, auth.user, 'announcement.create', announcement.title)
      return ok(reply, { announcement }, 201)
    },
  )

  /* ----------------------------------------------------------- notifications */

  app.get('/notifications', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const query = parse(
      z.object({ unread: z.enum(['true', 'false']).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) }),
      request.query,
    )
    const notifications = selectAll<{ read: boolean }>(db, 'notifications', {
      where: query.unread === 'true' ? { userId: auth.user.id, read: false } : { userId: auth.user.id },
      orderBy: 'createdAt',
      limit: query.limit,
    })
    return ok(reply, { notifications })
  })

  app.post('/notifications/:id/read', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const { id } = parse(idSchema, request.params)
    const notification = selectOne<{ userId: string }>(db, 'notifications', { id })
    if (!notification) throw notFound('Notification not found.')
    if (notification.userId !== auth.user.id) throw forbidden()
    updateRow(db, 'notifications', id, { read: true })
    return ok(reply, { read: true })
  })

  app.post('/notifications/read-all', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const result = db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(auth.user.id)
    return ok(reply, { updated: result.changes })
  })

  /* ---------------------------------------------------------------- feedback */

  app.post('/feedback', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const input = parse(feedbackSchema, request.body)
    const item: FeedbackItem = {
      id: newId('fb'),
      userId: auth.user.id,
      role: auth.user.role,
      category: input.category,
      subject: input.subject,
      message: input.message,
      status: 'new',
      createdAt: new Date().toISOString(),
    }
    upsert(db, 'feedback', item)
    for (const admin of selectAll<User>(db, 'users', { where: { role: 'admin', schoolId: auth.user.schoolId } })) {
      notifyUser(db, admin.id, 'system', 'New feedback', item.subject, '/admin/feedback')
    }
    return ok(reply, { feedback: item }, 201)
  })

  app.get('/feedback', { preHandler: requireAuth(db) }, async (request, reply) => {
    const auth = request.auth!
    const items =
      auth.user.role === 'admin'
        ? selectAll<FeedbackItem>(db, 'feedback', { orderBy: 'createdAt' }).filter((item) =>
            selectAll<User>(db, 'users', { where: { schoolId: auth.user.schoolId } }).some((u) => u.id === item.userId),
          )
        : selectAll<FeedbackItem>(db, 'feedback', { where: { userId: auth.user.id }, orderBy: 'createdAt' })
    return ok(reply, { feedback: items })
  })

  app.patch(
    '/feedback/:id',
    { preHandler: [requireAuth(db), requireRole('admin')] },
    async (request, reply) => {
      const auth = request.auth!
      const { id } = parse(idSchema, request.params)
      const item = selectOne<FeedbackItem>(db, 'feedback', { id })
      if (!item) throw notFound('Feedback not found.')
      const input = parse(feedbackPatchSchema, request.body)
      updateRow(db, 'feedback', id, { ...input, updatedAt: new Date().toISOString() })
      if (input.adminReply) {
        notifyUser(db, item.userId, 'system', 'Reply to your feedback', input.adminReply.slice(0, 160), '/feedback')
      }
      recordAudit(db, auth.user, 'feedback.update', item.subject)
      return ok(reply, { feedback: selectOne<FeedbackItem>(db, 'feedback', { id }) })
    },
  )
}
