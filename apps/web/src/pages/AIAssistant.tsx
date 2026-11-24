import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/store'
import { useI18n } from '../lib/i18n'
import { generateStudyAnswer, generateTeacherDraft } from '../lib/ai'
import { readConfig, uid } from '../lib/utils'
import { Icon } from '../components/Icon'
import {
  Badge,
  Button,
  Callout,
  Chip,
  Field,
  PageHeader,
  SectionCard,
  Select,
  Tabs,
  TextArea,
  TextInput,
} from '../components/ui'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  body: string
  title?: string
  steps?: string[]
  followUp?: string
  at: string
  draft?: boolean
}

const STUDENT_PROMPTS = [
  'Why is 2/3 bigger than 3/5?',
  'Explain photosynthesis simply',
  'When do we use past continuous?',
  'How does the water cycle work?',
  'How do I use a map scale?',
  'Why does a bulb glow only when the circuit is closed?',
]

export function AIAssistantPage() {
  const { currentUser, toast } = useApp()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const config = useMemo(() => readConfig(), [])
  const storageKey = `vidyagram.ai.${currentUser?.id || 'guest'}`
  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'admin'

  const [tab, setTab] = useState<'chat' | 'draft'>('chat')
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) return JSON.parse(raw) as ChatMessage[]
    } catch {
      /* ignore */
    }
    return currentUser
      ? [
          {
            id: 'welcome',
            role: 'assistant',
            body: isTeacher ? t('ai.teacherGreeting') : t('ai.greeting'),
            at: new Date().toISOString(),
          },
        ]
      : []
  })
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Teacher draft tool state
  const [draftKind, setDraftKind] = useState<'lesson' | 'questions' | 'revision' | 'simpler'>('lesson')
  const [draftTopic, setDraftTopic] = useState('')
  const [draftGrade, setDraftGrade] = useState(8)
  const [draft, setDraft] = useState('')
  const [draftError, setDraftError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-40)))
    } catch {
      /* storage full */
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, storageKey])

  if (!currentUser) return null

  const send = (text?: string) => {
    const prompt = (text ?? input).trim()
    if (!prompt) return
    const userMessage: ChatMessage = {
      id: uid('msg'),
      role: 'user',
      body: prompt,
      at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setThinking(true)

    window.setTimeout(() => {
      if (isTeacher) {
        const answer = generateStudyAnswer(prompt)
        setMessages((prev) => [
          ...prev,
          {
            id: uid('msg'),
            role: 'assistant',
            body: answer.body,
            title: answer.title,
            steps: answer.steps,
            followUp: answer.followUp,
            at: new Date().toISOString(),
            draft: true,
          },
        ])
      } else {
        const answer = generateStudyAnswer(prompt)
        setMessages((prev) => [
          ...prev,
          {
            id: uid('msg'),
            role: 'assistant',
            body: answer.body,
            title: answer.title,
            steps: answer.steps,
            followUp: answer.followUp,
            at: new Date().toISOString(),
          },
        ])
      }
      setThinking(false)
    }, 650)
  }

  const generateDraft = () => {
    if (!draftTopic.trim()) {
      setDraftError(t('ai.noResponse'))
      return
    }
    setDraftError('')
    setDraft(generateTeacherDraft(draftKind, draftTopic, draftGrade))
    toast('success', t('ai.generated'))
  }

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      toast('success', t('common.copied'), t('ai.insertAsDraft'))
    } catch {
      toast('error', t('common.errorTitle'), t('ai.insertAsDraft'))
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageHeader
        title={t('ai.title')}
        subtitle={isTeacher ? t('ai.teacherSub') : t('ai.studentSub')}
        icon="sparkles"
        actions={
          <Button variant="secondary" icon="trash" onClick={() => setMessages([])}>
            {t('ai.clear')}
          </Button>
        }
      />

      <Callout tone={config.ai.configured ? 'info' : 'warn'} icon={config.ai.configured ? 'cloud' : 'info'} title={config.ai.configured ? t('ai.configuredNotice', { provider: config.ai.provider || '—' }) : t('ai.notConfigured')}>
        {config.ai.configured
          ? 'This review build still answers with the on-device demo model, so no student data leaves the browser.'
          : t('ai.demoNotice')}
      </Callout>

      {isTeacher ? (
        <Tabs
          items={[
            { id: 'chat', label: t('ai.title') },
            { id: 'draft', label: t('ai.teacherPrompts') },
          ]}
          value={tab}
          onChange={(id) => setTab(id as typeof tab)}
        />
      ) : null}

      {tab === 'chat' || !isTeacher ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard className="lg:col-span-2" bodyClassName="p-0">
            <div className="border-b border-ink-100 bg-ink-50/60 px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-600">
                <Icon name="sparkles" size={13} className="text-brand-600" />
                {t('ai.studentSafe')}
              </p>
            </div>
            <div ref={scrollRef} className="scroll-thin max-h-[52vh] min-h-[320px] space-y-3 overflow-y-auto p-4">
              {messages.length ? (
                messages.map((message) => (
                  <div key={message.id} className={`flex gap-2.5 ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {message.role === 'assistant' ? (
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                        <Icon name="sparkles" size={15} />
                      </span>
                    ) : null}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'rounded-br-sm bg-brand-600 text-white'
                          : 'rounded-bl-sm border border-ink-200 bg-white text-ink-700'
                      }`}
                    >
                      {message.title && message.role === 'assistant' ? (
                        <p className="mb-1 flex flex-wrap items-center gap-1.5 font-bold text-ink-900">
                          {message.title}
                          {message.draft ? <Badge tone="saffron" icon="edit">{t('ai.teacherDraftLabel')}</Badge> : <Badge tone="brand" icon="sparkles">{t('common.aiGenerated')}</Badge>}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap">{message.body}</p>
                      {message.steps?.length ? (
                        <ol className="mt-2 space-y-1.5 border-t border-ink-100 pt-2">
                          {message.steps.map((step, i) => (
                            <li key={step} className="flex gap-2 text-[13px]">
                              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-800">{i + 1}</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      ) : null}
                      {message.followUp ? (
                        <p className="mt-2 rounded-lg bg-saffron-50 px-2.5 py-1.5 text-[12px] text-saffron-900">
                          <span className="font-semibold">{t('ai.suggestions')}: </span>
                          {message.followUp}
                        </p>
                      ) : null}
                      {message.role === 'assistant' ? (
                        <p className="mt-2 text-[10px] text-ink-400">{message.draft ? t('ai.teacherDraftLabel') : t('ai.disclaimer')}</p>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon name="sparkles" size={22} /></span>
                  <p className="mt-3 text-sm font-semibold text-ink-800">{t('ai.greeting')}</p>
                  <p className="mt-1 max-w-sm text-xs text-ink-500">{t('ai.demoNotice')}</p>
                </div>
              )}
              {thinking ? (
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />
                  {t('ai.thinking')}
                </div>
              ) : null}
            </div>
            <form
              className="flex items-end gap-2 border-t border-ink-100 p-3"
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
            >
              <div className="flex-1">
                <label htmlFor="ai-input" className="sr-only">{t('ai.placeholder')}</label>
                <TextInput
                  id="ai-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('ai.placeholder')}
                  autoComplete="off"
                />
              </div>
              <Button type="submit" icon="arrowRight" disabled={!input.trim() || thinking}>{t('ai.send')}</Button>
            </form>
          </SectionCard>

          <div className="space-y-4">
            <SectionCard title={t('ai.studentPrompts')} icon="help">
              <div className="flex flex-wrap gap-1.5">
                {STUDENT_PROMPTS.map((prompt) => (
                  <Chip key={prompt} onClick={() => send(prompt)}>{prompt}</Chip>
                ))}
              </div>
            </SectionCard>

            <Callout tone="info" icon="shield" title={t('privacy.title')}>
              {t('ai.conversationNote')}
            </Callout>
            <Callout tone="warn" icon="image" title={t('ai.imageNote')}>
              {t('ai.limits')}
            </Callout>
            <SectionCard title={t('ai.teacherPrompts')} icon="clipboard">
              <ul className="space-y-1.5 text-xs text-ink-600">
                <li>• {t('ai.lessonPlan')}</li>
                <li>• {t('ai.practiceQuestions')}</li>
                <li>• {t('ai.revisionNotes')}</li>
                <li>• {t('ai.simpler')}</li>
              </ul>
              <p className="mt-2 text-[11px] text-ink-400">{t('ai.teacherDraftLabel')}</p>
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <SectionCard title={t('ai.teacherPrompts')} subtitle={t('ai.teacherSub')} icon="sparkles" className="lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('ai.topicPrompt')} htmlFor="draft-topic" required error={draftError}>
                <TextInput id="draft-topic" value={draftTopic} onChange={(e) => setDraftTopic(e.target.value)} placeholder="fractions, photosynthesis, tenses…" />
              </Field>
              <Field label={t('ai.classPrompt')} htmlFor="draft-grade">
                <Select id="draft-grade" value={draftGrade} onChange={(e) => setDraftGrade(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => <option key={g} value={g}>Class {g}</option>)}
                </Select>
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { id: 'lesson', label: t('ai.lessonPlan') },
                { id: 'questions', label: t('ai.practiceQuestions') },
                { id: 'revision', label: t('ai.revisionNotes') },
                { id: 'simpler', label: t('ai.simpler') },
              ].map((kind) => (
                <Chip key={kind.id} active={draftKind === kind.id} onClick={() => setDraftKind(kind.id as typeof draftKind)}>
                  {kind.label}
                </Chip>
              ))}
            </div>
            <div className="mt-3">
              <Button onClick={generateDraft} icon="sparkles">{t('ai.generate')}</Button>
            </div>
            {draft ? (
              <div className="mt-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
                    {t('ai.outputTitle')} <Badge tone="saffron" icon="edit">{t('ai.teacherDraftLabel')}</Badge>
                  </p>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="secondary" icon="copy" onClick={() => void copyDraft()}>{t('ai.insertAsDraft')}</Button>
                    <Button size="sm" variant="ghost" icon="book" onClick={() => navigate('/materials')}>{t('nav.materials')}</Button>
                  </div>
                </div>
                <TextArea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[320px] font-mono text-[12px]" aria-label={t('ai.outputTitle')} />
                <p className="mt-1 text-[11px] text-ink-500">{t('ai.generated')}</p>
              </div>
            ) : null}
          </SectionCard>

          <div className="space-y-4">
            <Callout tone="warn" icon="alert" title={t('ai.teacherDraftLabel')}>{t('ai.limits')}</Callout>
            <Callout tone="info" icon="cloud" title={t('ai.notConfigured')}>{t('ai.demoNotice')}</Callout>
            <SectionCard title={t('ai.outputTitle')} icon="file">
              <ul className="space-y-1.5 text-xs text-ink-600">
                <li>• {t('ai.lessonPlan')}</li>
                <li>• {t('ai.practiceQuestions')}</li>
                <li>• {t('ai.revisionNotes')}</li>
                <li>• {t('ai.adapt')}</li>
              </ul>
              <p className="mt-2 text-[11px] text-ink-400">{t('ai.conversationNote')}</p>
            </SectionCard>
          </div>
        </div>
      )}

      <p className="text-center text-[11px] text-ink-400">{t('ai.teacherDraftLabel')} · {t('ai.studentSafe')}</p>
    </div>
  )
}
