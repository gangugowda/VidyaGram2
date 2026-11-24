import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../../lib/store'
import { useI18n } from '../../lib/i18n'
import { classById, classStudents, pendingParentLinksForAdmin, schoolById, studentClassIds, visibleClasses } from '../../lib/access'
import { RESOURCE_TYPE_LABEL } from '../../lib/subjects'
import { downloadTextFile, formatDate, hashPassword, makeSalt, readConfig, subjectLabel, uid } from '../../lib/utils'
import { toCsv } from '../../lib/offline'
import type { Role, School, User } from '../../lib/types'
import { Icon } from '../../components/Icon'
import { Avatar, Badge, Button, Callout, Card, CopyButton, EmptyState, Field, InfoList, Modal, PageHeader, SectionCard, Select, StatCard, TextInput, Toggle, buttonClass } from '../../components/ui'
export { AdminFeedbackPage } from '../Feedback'
export { ScholarshipsPage as AdminScholarshipsPage } from '../Scholarships'

const ROLES: Role[] = ['student', 'teacher', 'parent', 'admin']

const requireAdmin = (role?: string) => role === 'admin'

export function AdminSchoolsPage() {
  const { db, currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  const [editing, setEditing] = useState<School | null>(null)
  const [open, setOpen] = useState(false)

  if (!currentUser || !requireAdmin(currentUser.role)) return null
  const schools = db.schools

  const remove = (school: School) => {
    const inUse = db.users.some((u) => u.schoolId === school.id) || db.classes.some((c) => c.schoolId === school.id)
    if (inUse) {
      toast('error', t('admin.schoolInUse'))
      return
    }
    if (!window.confirm(`${t('admin.deleteSchool')} — ${school.name}?`)) return
    mutate((draft) => {
      draft.schools = draft.schools.filter((s) => s.id !== school.id)
    })
    toast('success', t('admin.schoolSaved'))
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('admin.schools')}
        subtitle={t('admin.sub')}
        icon="school"
        actions={<Button icon="plus" onClick={() => { setEditing(null); setOpen(true) }}>{t('admin.addSchool')}</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t('admin.schools')} value={schools.length} icon="school" />
        <StatCard label={t('admin.students')} value={db.users.filter((u) => u.role === 'student').length} icon="graduation" tone="leaf" />
        <StatCard label={t('admin.teachers')} value={db.users.filter((u) => u.role === 'teacher').length} icon="users" tone="brand" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {schools.map((school) => {
          const users = db.users.filter((u) => u.schoolId === school.id)
          const classes = db.classes.filter((c) => c.schoolId === school.id)
          return (
            <Card key={school.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-ink-900">{school.name}</h2>
                  <p className="mt-0.5 text-[11px] text-ink-500">{school.code} · {school.district}, {school.state}</p>
                </div>
                <Badge tone="brand" icon="users">{users.length} {t('admin.users').toLowerCase()}</Badge>
              </div>
              <InfoList
                items={[
                  { label: t('admin.threshold'), value: `${school.lowAttendanceThreshold}%` },
                  { label: t('admin.classes'), value: `${classes.length}` },
                  { label: t('admin.contactEmail'), value: school.contactEmail },
                  { label: t('admin.contactPhone'), value: school.contactPhone },
                ]}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" icon="edit" onClick={() => { setEditing(school); setOpen(true) }}>{t('common.edit')}</Button>
                <Button size="sm" variant="ghost" icon="trash" onClick={() => remove(school)}>{t('admin.deleteSchool')}</Button>
              </div>
            </Card>
          )
        })}
      </div>

      <SchoolForm open={open} onClose={() => setOpen(false)} school={editing} />
    </div>
  )
}

function SchoolForm({ open, onClose, school }: { open: boolean; onClose: () => void; school: School | null }) {
  const { currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  const [name, setName] = useState(school?.name || '')
  const [code, setCode] = useState(school?.code || '')
  const [district, setDistrict] = useState(school?.district || '')
  const [state, setState] = useState(school?.state || 'Uttar Pradesh')
  const [threshold, setThreshold] = useState(school?.lowAttendanceThreshold || 75)
  const [contactEmail, setContactEmail] = useState(school?.contactEmail || '')
  const [contactPhone, setContactPhone] = useState(school?.contactPhone || '')
  const [error, setError] = useState('')

  const submit = () => {
    if (!currentUser) return
    if (name.trim().length < 3 || code.trim().length < 2 || district.trim().length < 2) {
      setError(t('admin.required'))
      return
    }
    const saved: School = {
      id: school?.id || uid('sch'),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      district: district.trim(),
      state: state.trim(),
      lowAttendanceThreshold: Math.min(100, Math.max(1, threshold)),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      createdAt: school?.createdAt || new Date().toISOString(),
    }
    mutate((draft) => {
      const idx = draft.schools.findIndex((s) => s.id === saved.id)
      if (idx >= 0) draft.schools[idx] = saved
      else draft.schools.push(saved)
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: school ? 'Updated school' : 'Added school',
        detail: saved.name,
        at: new Date().toISOString(),
      })
    })
    toast('success', t('admin.schoolSaved'))
    setError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={school ? t('admin.schools') : t('admin.addSchool')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button icon="check" onClick={submit}>{t('common.save')}</Button></>}
    >
      <div className="space-y-3.5">
        {error ? <Callout tone="danger" title={error} /> : null}
        <Field label={t('admin.schoolName')} htmlFor="school-name" required>
          <TextInput id="school-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('admin.schoolCode')} htmlFor="school-code" required>
            <TextInput id="school-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label={t('admin.district')} htmlFor="school-district" required>
            <TextInput id="school-district" value={district} onChange={(e) => setDistrict(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('admin.state')} htmlFor="school-state">
            <TextInput id="school-state" value={state} onChange={(e) => setState(e.target.value)} />
          </Field>
          <Field label={t('admin.threshold')} htmlFor="school-threshold">
            <TextInput id="school-threshold" type="number" min={1} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('admin.contactEmail')} htmlFor="school-email">
            <TextInput id="school-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </Field>
          <Field label={t('admin.contactPhone')} htmlFor="school-phone">
            <TextInput id="school-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  )
}

export function AdminUsersPage() {
  const { db, currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  const [role, setRole] = useState('all')
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  if (!currentUser || !requireAdmin(currentUser.role)) return null

  const base = db.users.filter((u) => u.schoolId === currentUser.schoolId)
  const list = base
    .filter((u) => role === 'all' || u.role === role)
    .filter((u) => !query.trim() || `${u.name} ${u.email}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name))

  const toggleDisabled = (user: User) => {
    if (user.id === currentUser.id) {
      toast('error', t('common.errorTitle'), 'You cannot disable your own account.')
      return
    }
    mutate((draft) => {
      const target = draft.users.find((u) => u.id === user.id)
      if (target) target.disabled = !target.disabled
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: user.disabled ? 'Enabled account' : 'Disabled account',
        detail: `${user.name} (${user.role})`,
        at: new Date().toISOString(),
      })
    })
    toast('success', user.disabled ? t('admin.enabledToast') : t('admin.disabledToast'))
  }

  const exportUsers = () => {
    const rows = [
      ['Name', 'Email', 'Role', 'Phone', 'Class', 'Disabled', 'Created'],
      ...list.map((u) => [
        u.name,
        u.email,
        u.role,
        u.phone || '',
        u.role === 'student' ? `${u.gradeLevel || ''}${u.section || ''}` : '',
        u.disabled ? 'yes' : 'no',
        u.createdAt,
      ]),
    ]
    downloadTextFile('vidyagram-users.csv', toCsv(rows))
    toast('success', t('common.export'))
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('admin.users')}
        subtitle={t('admin.sub')}
        icon="users"
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={exportUsers}>{t('admin.exportUsers')}</Button>
            <Button icon="plus" onClick={() => setAddOpen(true)}>{t('admin.addUser')}</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(role === r ? 'all' : r)}
            className={`card p-3 text-left ${role === r ? 'ring-2 ring-brand-400' : ''}`}
            aria-pressed={role === r}
          >
            <p className="text-[10px] text-ink-500">{t(`role.${r}`)}</p>
            <p className="text-xl font-bold text-ink-900">{base.filter((u) => u.role === r).length}</p>
          </button>
        ))}
      </div>

      <SectionCard icon="filter" bodyClassName="space-y-3">
        <div className="relative">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-3 text-ink-400" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('admin.searchUsers')} aria-label={t('admin.searchUsers')} className="pl-9" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setRole('all')} className={`min-h-8 rounded-full border px-3 text-xs font-medium ${role === 'all' ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-700'}`}>{t('common.all')}</button>
          {ROLES.map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={`min-h-8 rounded-full border px-3 text-xs font-medium ${role === r ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 text-ink-700'}`}>{t(`role.${r}`)}</button>
          ))}
          <span className="ml-auto text-[10px] text-ink-400">{list.length} {t('common.results').toLowerCase()}</span>
        </div>
      </SectionCard>

      {list.length ? (
        <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-ink-50 text-[10px] uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">{t('common.fullName')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('admin.userRole')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('common.class')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('common.status')}</th>
                  <th className="px-3 py-2.5 font-semibold">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {list.map((u) => (
                  <tr key={u.id} className={u.disabled ? 'bg-ink-50/60 text-ink-400' : ''}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={u.name} color={u.avatarColor} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink-800">{u.name}</p>
                          <p className="truncate text-[10px] text-ink-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><Badge tone="neutral">{t(`role.${u.role}`)}</Badge></td>
                    <td className="px-3 py-2.5 text-ink-600">{u.role === 'student' ? `Class ${u.gradeLevel}${u.section}` : '—'}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={u.disabled ? 'clay' : 'leaf'} icon={u.disabled ? 'lock' : 'checkCircle'}>
                        {u.disabled ? t('admin.disable') : t('common.approved')}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Button size="sm" variant="ghost" icon={u.disabled ? 'check' : 'lock'} onClick={() => toggleDisabled(u)} disabled={u.id === currentUser.id}>
                        {u.disabled ? t('admin.enable') : t('admin.disable')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon="users" title={t('common.noData')} description={t('admin.searchUsers')} />
      )}

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function AddUserModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { db, currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  const classes = currentUser ? db.classes.filter((c) => c.schoolId === currentUser.schoolId) : []
  const [role, setRole] = useState<Role>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [classId, setClassId] = useState(classes[0]?.id || '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!currentUser) return
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8) {
      setError(t('admin.required'))
      return
    }
    if (db.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setError(t('admin.userExists'))
      return
    }
    setBusy(true)
    const salt = makeSalt()
    const passwordHash = await hashPassword(password, salt)
    const cls = classes.find((c) => c.id === classId)
    const user: User = {
      id: uid('usr'),
      role,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      passwordHash,
      salt,
      language: 'en',
      avatarColor: 'bg-brand-100 text-brand-800',
      schoolId: currentUser.schoolId,
      createdAt: new Date().toISOString(),
      consentGiven: role === 'student',
      consentAt: role === 'student' ? new Date().toISOString() : undefined,
      ...(role === 'student' ? { gradeLevel: cls?.gradeLevel, section: cls?.section, rollNo: String(db.users.filter((u) => u.role === 'student').length + 1).padStart(2, '0') } : {}),
      ...(role === 'parent' ? { relationship: 'Guardian' } : {}),
      ...(role === 'teacher' ? { subjectIds: [] } : {}),
    }
    mutate((draft) => {
      draft.users.push(user)
      if (role === 'student' && cls) {
        draft.enrollments.push({ id: uid('enr'), classId: cls.id, studentId: user.id, joinedAt: new Date().toISOString(), status: 'active' })
      }
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'Added user account',
        detail: `${user.name} (${user.role})`,
        at: new Date().toISOString(),
      })
    })
    setBusy(false)
    toast('success', t('admin.userAdded'), user.email)
    setName('')
    setEmail('')
    setPhone('')
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('admin.addUser')}
      description={t('auth.demoNote')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button><Button icon="check" loading={busy} onClick={() => void submit()}>{t('common.create')}</Button></>}
    >
      <div className="space-y-3.5">
        {error ? <Callout tone="danger" title={error} /> : null}
        <Field label={t('admin.userRole')} htmlFor="au-role">
          <Select id="au-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}`)}</option>)}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.fullName')} htmlFor="au-name" required>
            <TextInput id="au-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t('common.email')} htmlFor="au-email" required>
            <TextInput id="au-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('common.phone')} htmlFor="au-phone">
            <TextInput id="au-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label={t('common.password')} htmlFor="au-password" hint={t('auth.passwordHint')} required>
            <TextInput id="au-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>
        {role === 'student' ? (
          <Field label={t('common.class')} htmlFor="au-class">
            <Select id="au-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        ) : null}
        <p className="text-[10px] leading-relaxed text-ink-400">{t('auth.classCodeHint')}</p>
      </div>
    </Modal>
  )
}

export function AdminClassesPage() {
  const { db, currentUser, mutate, toast } = useApp()
  const { t } = useI18n()
  if (!currentUser || !requireAdmin(currentUser.role)) return null
  const classes = visibleClasses(db, currentUser)

  const toggleLeaderboard = (classId: string) => {
    mutate((draft) => {
      const cls = draft.classes.find((c) => c.id === classId)
      if (cls) cls.leaderboardEnabled = !cls.leaderboardEnabled
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'Updated class settings',
        detail: `Leaderboard toggled for ${classId}`,
        at: new Date().toISOString(),
      })
    })
    toast('success', t('classes.settings'))
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('admin.classes')}
        subtitle={t('admin.sub')}
        icon="library"
        actions={<Link to="/classes" className={buttonClass('primary', 'md')}>{t('classes.create')} <Icon name="arrowRight" size={16} /></Link>}
      />
      {classes.length ? (
        <div className="space-y-3">
          {classes.map((cls) => {
            const teacher = db.users.find((u) => u.id === cls.teacherId)
            const students = classStudents(db, cls.id)
            return (
              <Card key={cls.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-ink-900">{cls.name}</h2>
                    <p className="mt-0.5 text-[11px] text-ink-500">{teacher?.name} · {students.length} {t('common.students').toLowerCase()} · {schoolById(db, cls.schoolId)?.code}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="brand" icon="users">{t('classes.members', { count: students.length })}</Badge>
                    <Badge tone={cls.leaderboardEnabled ? 'leaf' : 'neutral'} icon={cls.leaderboardEnabled ? 'award' : 'lock'}>
                      {t('dash.leaderboard')}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {cls.subjectIds.map((s) => <Badge key={s} tone="neutral">{subjectLabel(s, t)}</Badge>)}
                  <span className="text-[11px] text-ink-500">{t('classes.code')}: <code className="font-mono font-bold text-ink-800">{cls.code}</code></span>
                  <CopyButton value={cls.code} label={t('common.copy')} />
                  <Button size="sm" variant="ghost" icon="refresh" onClick={() => toggleLeaderboard(cls.id)}>{t('classes.settings')}</Button>
                  <Link to="/classes" className={buttonClass('secondary', 'sm')}>{t('dash.manage')}</Link>
                </div>
              </Card>
            )
          })}
        </div>
      ) : <EmptyState icon="library" title={t('classes.noClasses')} />}
    </div>
  )
}

export function AdminContentPage() {
  const { db, currentUser, mutate, toast } = useApp()
  const { t, lang } = useI18n()
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')

  if (!currentUser || !requireAdmin(currentUser.role)) return null
  const classIds = new Set(db.classes.filter((c) => c.schoolId === currentUser.schoolId).map((c) => c.id))
  const all = db.resources.filter((r) => classIds.has(r.classId))
  const list = all
    .filter((r) => status === 'all' || (status === 'published' ? r.published : !r.published))
    .filter((r) => !query.trim() || `${r.title} ${r.chapter}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(a.published) - Number(b.published) || b.uploadedAt.localeCompare(a.uploadedAt))

  const toggle = (id: string) => {
    mutate((draft) => {
      const r = draft.resources.find((x) => x.id === id)
      if (r) r.published = !r.published
    })
    toast('success', t('mat.studentsSee'))
  }

  const remove = (id: string) => {
    if (!window.confirm(t('mat.removeConfirm'))) return
    mutate((draft) => {
      draft.resources = draft.resources.filter((r) => r.id !== id)
      draft.bookmarks = draft.bookmarks.filter((b) => b.resourceId !== id)
      draft.downloads = draft.downloads.filter((d) => !(d.kind === 'resource' && d.refId === id))
    })
    toast('success', t('mat.deleted'))
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('admin.content')}
        subtitle={t('admin.sub')}
        icon="book"
        actions={<Link to="/materials?upload=1" className={buttonClass('primary', 'md')}>{t('mat.upload')} <Icon name="arrowRight" size={16} /></Link>}
      />
      <div className="grid grid-cols-3 gap-2">
        <StatCard label={t('admin.resources')} value={all.length} icon="book" />
        <StatCard label={t('common.published')} value={all.filter((r) => r.published).length} icon="checkCircle" tone="leaf" />
        <StatCard label={t('common.draft')} value={all.filter((r) => !r.published).length} icon="edit" tone="saffron" />
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-3 text-ink-400" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('mat.search')} aria-label={t('mat.search')} className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-52" aria-label={t('common.status')}>
          <option value="all">{t('common.all')}</option>
          <option value="published">{t('common.published')}</option>
          <option value="draft">{t('common.draft')}</option>
        </Select>
      </div>
      {list.length ? (
        <div className="space-y-2">
          {list.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center gap-3 p-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><Icon name="file" size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-900">{r.title}</p>
                <p className="text-[10px] text-ink-500">{classById(db, r.classId)?.name} · {r.chapter} · {t(RESOURCE_TYPE_LABEL[r.type])} · {formatDate(r.uploadedAt.slice(0, 10), lang)}</p>
              </div>
              <Badge tone={r.published ? 'leaf' : 'neutral'}>{r.published ? t('common.published') : t('common.draft')}</Badge>
              <Button size="sm" variant="secondary" onClick={() => toggle(r.id)}>{r.published ? t('common.unpublish') : t('common.publish')}</Button>
              <Button size="sm" variant="ghost" icon="trash" onClick={() => remove(r.id)} aria-label={t('common.delete')} />
            </Card>
          ))}
        </div>
      ) : <EmptyState icon="book" title={t('mat.noResults')} />}
    </div>
  )
}

export function AdminApprovalsPage() {
  const { db, currentUser, mutate, toast } = useApp()
  const { t, lang } = useI18n()
  if (!currentUser || !requireAdmin(currentUser.role)) return null
  const pending = pendingParentLinksForAdmin(db, currentUser.schoolId)
  const approved = db.parentLinks.filter((l) => {
    if (l.status !== 'approved') return false
    const student = db.users.find((u) => u.id === l.studentId)
    return student?.schoolId === currentUser.schoolId
  })

  const decide = (id: string, status: 'approved' | 'rejected') => {
    mutate((draft) => {
      const link = draft.parentLinks.find((l) => l.id === id)
      if (!link) return
      link.status = status
      link.respondedAt = new Date().toISOString()
      const student = draft.users.find((u) => u.id === link.studentId)
      const cls = draft.classes.find((c) => c.id === studentClassIds(draft, link.studentId)[0])
      for (const uidTarget of [link.parentId, link.studentId, cls?.teacherId].filter(Boolean) as string[]) {
        draft.notifications.unshift({
          id: uid('notif'),
          userId: uidTarget,
          kind: 'link',
          title: status === 'approved' ? 'Guardian link approved' : 'Guardian link declined',
          body: status === 'approved' ? `${student?.name || 'Student'} is now linked to the guardian account.` : 'A guardian link request was declined after review.',
          link: uidTarget === link.parentId ? '/dashboard' : '/profile',
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: status === 'approved' ? 'Approved guardian link' : 'Rejected guardian link',
        detail: `${link.parentId} → ${link.studentId}`,
        at: new Date().toISOString(),
      })
    })
    toast('success', status === 'approved' ? t('prof.approved') : t('prof.rejected'))
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title={t('admin.approvals')} subtitle={t('parent.accessNote')} icon="lock" />
      <Callout tone="warn" icon="shield" title={t('admin.approvals')}>{t('parent.inviteHint')} {t('parent.accessNote')}</Callout>
      {pending.length ? (
        <div className="space-y-3">
          {pending.map((link) => {
            const parent = db.users.find((u) => u.id === link.parentId)
            const student = db.users.find((u) => u.id === link.studentId)
            return (
              <Card key={link.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-ink-900">{parent?.name} → {student?.name}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">{t('common.requestedAt', { date: formatDate(link.requestedAt.slice(0, 10), lang) })} · {link.method === 'code' ? t('parent.linkCode') : t('parent.linkApproval')}</p>
                    {link.note ? <p className="mt-1 rounded-lg bg-ink-50 px-2 py-1.5 text-xs text-ink-700">{link.note}</p> : null}
                  </div>
                  <Badge tone="saffron" icon="clock">{t('common.pending')}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="success" icon="check" onClick={() => decide(link.id, 'approved')}>{t('admin.approve')}</Button>
                  <Button size="sm" variant="danger" icon="x" onClick={() => decide(link.id, 'rejected')}>{t('admin.reject')}</Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : <EmptyState icon="lock" title={t('admin.noApprovals')} />}

      <SectionCard title={t('admin.linksTitle')} subtitle={`${approved.length} ${t('common.approved').toLowerCase()}`} icon="link">
        <ul className="divide-y divide-ink-100">
          {approved.map((link) => {
            const parent = db.users.find((u) => u.id === link.parentId)
            const student = db.users.find((u) => u.id === link.studentId)
            return (
              <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                <span className="font-medium text-ink-800">{parent?.name} → {student?.name}</span>
                <span className="text-[10px] text-ink-400">{formatDate((link.respondedAt || link.requestedAt).slice(0, 10), lang)}</span>
              </li>
            )
          })}
        </ul>
      </SectionCard>
    </div>
  )
}

export function AdminSettingsPage() {
  const { db, currentUser, mutate, resetDemo, toast } = useApp()
  const { t } = useI18n()
  const navigate = useNavigate()
  const config = readConfig()
  const [platformName, setPlatformName] = useState(db.config.platformName)
  const [supportEmail, setSupportEmail] = useState(db.config.supportEmail)
  const [threshold, setThreshold] = useState(db.config.lowAttendanceThreshold)
  const [allowSelfSignup, setAllowSelfSignup] = useState(db.config.allowSelfSignup)
  const [leaderboardDefault, setLeaderboardDefault] = useState(db.config.leaderboardDefault)
  const [notice, setNotice] = useState(db.config.scholarListingNotice)

  if (!currentUser || !requireAdmin(currentUser.role)) return null

  const save = () => {
    mutate((draft) => {
      draft.config.platformName = platformName.trim() || 'VidyaGram'
      draft.config.supportEmail = supportEmail.trim()
      draft.config.lowAttendanceThreshold = Math.min(100, Math.max(1, threshold))
      draft.config.allowSelfSignup = allowSelfSignup
      draft.config.leaderboardDefault = leaderboardDefault
      draft.config.scholarListingNotice = notice.trim()
      draft.audit.unshift({
        id: uid('aud'),
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        action: 'Updated platform settings',
        detail: 'Platform name, support contact and policy toggles.',
        at: new Date().toISOString(),
      })
    })
    toast('success', t('admin.settingsSaved'))
  }

  const integrations = [
    { label: t('admin.zoomStatus'), configured: config.zoom.configured, body: config.zoom.label },
    { label: t('admin.aiStatus'), configured: config.ai.configured, body: config.ai.provider || t('ai.demoNotice') },
    { label: t('admin.emailStatus'), configured: config.email.configured, body: t('notif.emailOff') },
    { label: t('admin.smsStatus'), configured: config.sms.configured, body: t('notif.smsOff') },
  ]

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title={t('admin.settings')} subtitle={t('admin.sub')} icon="settings" />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title={t('admin.settings')} icon="settings">
          <div className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('admin.platformName')} htmlFor="set-name">
                <TextInput id="set-name" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
              </Field>
              <Field label={t('admin.supportEmail')} htmlFor="set-email">
                <TextInput id="set-email" type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} />
              </Field>
            </div>
            <Field label={t('admin.threshold')} htmlFor="set-threshold">
              <TextInput id="set-threshold" type="number" min={1} max={100} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
            </Field>
            <Toggle checked={allowSelfSignup} onChange={setAllowSelfSignup} label={t('admin.selfSignup')} description={t('auth.demoNote')} />
            <Toggle checked={leaderboardDefault} onChange={setLeaderboardDefault} label={t('admin.defaultLeaderboard')} description={t('lb.privateNote')} />
            <Field label={t('sch.sampleNotice')} htmlFor="set-notice">
              <TextInput id="set-notice" value={notice} onChange={(e) => setNotice(e.target.value)} />
            </Field>
            <div className="flex justify-end">
              <Button icon="check" onClick={save}>{t('admin.saveSettings')}</Button>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title={t('admin.integrationStatus')} icon="plug">
            <ul className="space-y-2">
              {integrations.map((item) => (
                <li key={item.label} className="flex items-start justify-between gap-2 rounded-lg border border-ink-200 p-2.5">
                  <div>
                    <p className="text-xs font-semibold text-ink-800">{item.label}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-ink-500">{item.body}</p>
                  </div>
                  <Badge tone={item.configured ? 'leaf' : 'neutral'}>{item.configured ? t('admin.configured') : t('admin.notConfigured')}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] leading-relaxed text-ink-400">{t('admin.integrationsBody')}</p>
          </SectionCard>

          <SectionCard title={t('admin.audit')} subtitle={t('admin.auditHint')} icon="clipboard">
            <ul className="divide-y divide-ink-100">
              {db.audit.slice(0, 8).map((entry) => (
                <li key={entry.id} className="py-2 text-xs">
                  <p className="font-semibold text-ink-800">{entry.action}</p>
                  <p className="text-[10px] text-ink-500">{entry.actorName} · {entry.detail}</p>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title={t('admin.resetDemo')} icon="refresh">
            <p className="text-xs leading-relaxed text-ink-600">{t('admin.resetHint')}</p>
            <Button
              variant="danger"
              icon="refresh"
              className="mt-2"
              onClick={async () => {
                if (!window.confirm(t('admin.resetHint'))) return
                await resetDemo()
                navigate('/login')
              }}
            >
              {t('admin.resetDemo')}
            </Button>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
