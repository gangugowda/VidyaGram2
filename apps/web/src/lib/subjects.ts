import type { ResourceType } from './types'

export interface SubjectDef {
  id: string
  nameKey: string
  short: string
  color: string
  soft: string
}

/** Canonical subject catalogue. Display names are translated via i18n keys. */
export const SUBJECTS: SubjectDef[] = [
  { id: 'math', nameKey: 'subject.math', short: 'M', color: 'bg-brand-600', soft: 'bg-brand-50 text-brand-800' },
  { id: 'science', nameKey: 'subject.science', short: 'S', color: 'bg-leaf-600', soft: 'bg-leaf-50 text-leaf-800' },
  { id: 'english', nameKey: 'subject.english', short: 'E', color: 'bg-saffron-500', soft: 'bg-saffron-50 text-saffron-800' },
  { id: 'hindi', nameKey: 'subject.hindi', short: 'हि', color: 'bg-clay-500', soft: 'bg-clay-50 text-clay-800' },
  { id: 'social', nameKey: 'subject.social', short: 'SS', color: 'bg-ink-600', soft: 'bg-ink-100 text-ink-800' },
  { id: 'computer', nameKey: 'subject.computer', short: 'CS', color: 'bg-brand-800', soft: 'bg-brand-100 text-brand-900' },
  { id: 'evs', nameKey: 'subject.evs', short: 'EVS', color: 'bg-leaf-700', soft: 'bg-leaf-100 text-leaf-900' },
]

export const subjectById = (id: string) => SUBJECTS.find((s) => s.id === id)

export const RESOURCE_TYPES: ResourceType[] = [
  'note',
  'textbook',
  'question-paper',
  'mcq-set',
  'fill-blanks',
  'revision',
  'storybook',
  'supplementary',
]

export const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  note: 'rtype.note',
  textbook: 'rtype.textbook',
  'question-paper': 'rtype.questionPaper',
  'mcq-set': 'rtype.mcqSet',
  'fill-blanks': 'rtype.fillBlanks',
  revision: 'rtype.revision',
  storybook: 'rtype.storybook',
  supplementary: 'rtype.supplementary',
}

export const ROLE_LABELS: Record<string, string> = {
  student: 'role.student',
  teacher: 'role.teacher',
  parent: 'role.parent',
  admin: 'role.admin',
}
