import type { Question, Quiz } from '@vidyagram/shared'

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

/**
 * Grades objective questions on the server so a student cannot change the
 * score in the browser. Only questions that belong to the quiz are counted.
 */
export const gradeQuiz = (quiz: Quiz, answers: Record<string, string>): GradeResult => {
  let score = 0
  const correct: Record<string, boolean> = {}
  for (const question of quiz.questions) {
    const given = typeof answers[question.id] === 'string' ? answers[question.id] : ''
    const ok = given.trim().length > 0 && isAnswerCorrect(question, given)
    correct[question.id] = ok
    if (ok) score += question.points
  }
  return {
    score,
    maxScore: quiz.questions.reduce((sum, question) => sum + question.points, 0),
    correct,
  }
}
