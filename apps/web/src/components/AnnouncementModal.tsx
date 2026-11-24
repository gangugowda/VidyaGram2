import { useState } from 'react'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { classStudents } from '../lib/access'
import type { ClassRoom } from '../lib/types'
import { uid } from '../lib/utils'
import { Button, Callout, Field, Modal, Select, TextArea, TextInput } from './ui'

export function AnnouncementModal({
  open,
  onClose,
  classes,
  defaultClassId,
}: {
  open: boolean
  onClose: () => void
  classes: ClassRoom[]
  defaultClassId?: string
}) {
  const { db, currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  const [classId, setClassId] = useState(defaultClassId || classes[0]?.id || '')
  const [audience, setAudience] = useState<'students' | 'parents' | 'all'>('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState('')

  if (!currentUser) return null

  const send = () => {
    if (!title.trim() || !body.trim()) {
      setError(t('mat.required'))
      return
    }
    const cls = classes.find((c) => c.id === classId)
    const notificationTitle = title.trim()
    const notificationBody = body.trim()
    mutate((draft) => {
      draft.announcements.unshift({
        id: uid('ann'),
        classId: classId || undefined,
        schoolId: currentUser.schoolId,
        title: notificationTitle,
        body: notificationBody,
        authorId: currentUser.id,
        audience,
        createdAt: new Date().toISOString(),
      })

      const studentIds = cls
        ? classStudents(draft, cls.id).map((s) => s.id)
        : draft.users.filter((u) => u.role === 'student' && u.schoolId === currentUser.schoolId).map((u) => u.id)

      const recipients = new Set<string>()
      if (audience === 'students' || audience === 'all') studentIds.forEach((id) => recipients.add(id))
      if (audience === 'parents' || audience === 'all') {
        for (const link of draft.parentLinks) {
          if (link.status === 'approved' && studentIds.includes(link.studentId)) recipients.add(link.parentId)
        }
      }
      for (const userId of recipients) {
        draft.notifications.unshift({
          id: uid('notif'),
          userId,
          kind: 'announcement',
          title: notificationTitle,
          body: notificationBody,
          link: '/notifications',
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
    })
    toast('success', t('dash.postAnnouncement'), `${title.trim()}`)
    setTitle('')
    setBody('')
    setError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('dash.postAnnouncement')}
      description="Students and guardians see this in their notifications and class feed."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button icon="bell" onClick={send}>{t('dash.postAnnouncement')}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('common.class')} htmlFor="ann-class">
            <Select id="ann-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Audience" htmlFor="ann-audience">
            <Select id="ann-audience" value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
              <option value="all">Students and guardians</option>
              <option value="students">Students only</option>
              <option value="parents">Guardians only</option>
            </Select>
          </Field>
        </div>
        <Field label={t('fb.subject')} htmlFor="ann-title" required>
          <TextInput id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Unit test schedule" maxLength={90} />
        </Field>
        <Field label="Message" htmlFor="ann-body" required hint="Keep it short and specific. Avoid personal information about individual students.">
          <TextArea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={600} />
        </Field>
        {error ? <Callout tone="danger" title={error} /> : null}
        <Callout tone="info" title="Who can see this">
          {audience === 'parents'
            ? 'Only guardians with an approved link to a student in this class are notified.'
            : audience === 'students'
              ? 'Only enrolled students in this class are notified.'
              : 'Enrolled students and their approved guardians are notified.'}
        </Callout>
        <p className="text-[11px] text-ink-400">
          This demo sends in-app notifications only. Email and SMS delivery require a configured gateway.
        </p>
      </div>
    </Modal>
  )
}
