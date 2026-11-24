import { Link } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { formatDate, todayISO } from '../lib/utils'
import { Icon, type IconName } from '../components/Icon'
import { Badge, Callout, Card, PageHeader, SectionCard, buttonClass } from '../components/ui'

const PERMISSIONS: Array<{ key: string; label: string; student: string; teacher: string; parent: string; admin: string }> = [
  {
    key: 'own-records',
    label: 'Own attendance, marks, doubts and downloads',
    student: 'allowed',
    teacher: 'denied',
    parent: 'denied',
    admin: 'allowed',
  },
  {
    key: 'class-records',
    label: 'Records of students in their own classes',
    student: 'denied',
    teacher: 'allowed',
    parent: 'denied',
    admin: 'allowed',
  },
  {
    key: 'linked-child',
    label: 'Records of a child with an approved guardian link',
    student: 'denied',
    teacher: 'denied',
    parent: 'allowed',
    admin: 'allowed',
  },
  {
    key: 'class-code',
    label: 'Use a class code to join a class',
    student: 'allowed',
    teacher: 'denied',
    parent: 'denied',
    admin: 'allowed',
  },
  {
    key: 'other-student',
    label: 'Open another student’s private records',
    student: 'denied',
    teacher: 'denied',
    parent: 'denied',
    admin: 'denied',
  },
]

export function PrivacyPage() {
  const { db, currentUser } = useApp()
  const { t, lang } = useI18n()

  const roleCard = (icon: IconName, title: string, body: string) => (
    <div className="rounded-xl border border-ink-200 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-ink-900">
        <Icon name={icon} size={15} className="text-brand-600" /> {title}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-600">{body}</p>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title={t('privacy.title')} subtitle={t('privacy.sub')} icon="shield" />

      <Callout tone="info" icon="shield" title={t('privacy.summaryTitle')}>
        {t('privacy.summary')}
      </Callout>

      <div className="grid gap-3 sm:grid-cols-2">
        <SectionCard title={t('privacy.whoSees')} icon="eye">
          <div className="grid gap-2 sm:grid-cols-2">
            {roleCard('user', t('role.student'), t('privacy.students'))}
            {roleCard('graduation', t('role.teacher'), t('privacy.teachers'))}
            {roleCard('users', t('role.parent'), t('privacy.parents'))}
            {roleCard('settings', t('role.admin'), t('privacy.admins'))}
          </div>
        </SectionCard>

        <SectionCard title={t('privacy.consent')} icon="shield">
          <p className="text-xs leading-relaxed text-ink-700">{t('privacy.consentBody')}</p>
          <div className="mt-3 rounded-xl border border-ink-200 bg-ink-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-900">
              <Icon name="award" size={14} className="text-brand-600" /> {t('privacy.leaderboard')}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-600">{t('lb.privateNote')}</p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-700">{t('privacy.ai')}</p>
          {currentUser?.consentAt ? (
            <Badge tone="leaf" icon="checkCircle" className="mt-3">
              {t('prof.consentGiven', { date: formatDate(currentUser.consentAt.slice(0, 10), lang) })}
            </Badge>
          ) : (
            <Badge tone="saffron" icon="alert" className="mt-3">{t('prof.consentMissing')}</Badge>
          )}
        </SectionCard>
      </div>

      <SectionCard title={t('privacy.roleAccess')} icon="lock">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead>
              <tr className="border-b border-ink-200 text-[10px] uppercase tracking-wide text-ink-500">
                <th className="py-2 pr-3 font-semibold">{t('privacy.permission')}</th>
                <th className="px-2 py-2 font-semibold">{t('role.student')}</th>
                <th className="px-2 py-2 font-semibold">{t('role.teacher')}</th>
                <th className="px-2 py-2 font-semibold">{t('role.parent')}</th>
                <th className="px-2 py-2 font-semibold">{t('role.admin')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {PERMISSIONS.map((p) => (
                <tr key={p.key}>
                  <td className="py-2 pr-3 text-ink-700">{p.label}</td>
                  {[p.student, p.teacher, p.parent, p.admin].map((value, i) => (
                    <td key={i} className="px-2 py-2">
                      {value === 'allowed' ? (
                        <span className="inline-flex items-center gap-1 font-medium text-leaf-700"><Icon name="check" size={13} /> {t('privacy.allowed')}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-clay-700"><Icon name="x" size={13} /> {t('privacy.denied')}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-ink-400">
          {t('privacy.demoNote')} {t('app.demoBanner')}
        </p>
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <SectionCard title={t('privacy.security')} icon="lock">
          <p className="text-xs leading-relaxed text-ink-700">{t('privacy.securityBody')}</p>
        </SectionCard>
        <SectionCard title={t('privacy.report')} icon="heart">
          <p className="text-xs leading-relaxed text-ink-700">{t('privacy.reportHint')}</p>
          <Link to={currentUser ? '/feedback' : '/login'} className={buttonClass('secondary', 'sm', 'mt-3')}>
            {currentUser ? t('nav.feedback') : t('common.signIn')} <Icon name="arrowRight" size={14} />
          </Link>
          <p className="mt-3 text-[10px] text-ink-400">{t('privacy.lastUpdated', { date: formatDate(todayISO(), lang) })}</p>
        </SectionCard>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" icon="school">{db.config.platformName}</Badge>
          <span className="text-[11px] text-ink-500">{db.config.supportEmail}</span>
          <span className="text-[11px] text-ink-400">· {t('app.by')}</span>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-400">
          {t('privacy.demoNote')} Sample accounts, classes, marks and devices are demonstration data.
        </p>
      </Card>
    </div>
  )
}
