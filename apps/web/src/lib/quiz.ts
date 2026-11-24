import type { Question, Quiz } from './types'

export interface GradeResult {
  score: number
  maxScore: number
  correct: Record<string, boolean>
}

const normalise = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"“”‘’]/g, '')
    .replace(/\s+/g, ' ')

export const isAnswerCorrect = (question: Question, given: string): boolean => {
  if (question.type === 'mcq') return normalise(given) === normalise(question.answer)
  const accepted = [question.answer, ...(question.accept || [])].map(normalise)
  return accepted.includes(normalise(given))
}

/** Auto-grades objective questions only. */
export const gradeQuiz = (quiz: Quiz, answers: Record<string, string>): GradeResult => {
  let score = 0
  const correct: Record<string, boolean> = {}
  for (const question of quiz.questions) {
    const given = answers[question.id] || ''
    const ok = given.trim().length > 0 && isAnswerCorrect(question, given)
    correct[question.id] = ok
    if (ok) score += question.points
  }
  return { score, maxScore: quiz.questions.reduce((s, q) => s + q.points, 0), correct }
}

export const resultWhenLabel = (quiz: Quiz, dueLabel: string, manualLabel: string): string => {
  if (quiz.showResults === 'immediately') return ''
  if (quiz.showResults === 'after_due') return dueLabel
  return manualLabel
}
