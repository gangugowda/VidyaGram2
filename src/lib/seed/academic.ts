import type { Assessment, AttendanceDay, AttendanceEntry, AttendanceStatus, LabRun, Mark } from '../types'
import { gradeFromPercent } from '../utils'
import { iso, schoolDays, stamp } from './helpers'

const eighth = ['usr_aarav', 'usr_priya', 'usr_imran', 'usr_kavya', 'usr_rohan', 'usr_meena', 'usr_arjun', 'usr_fatima', 'usr_nikhil']

/** Deterministic attendance patterns so the demo tells a consistent story. */
const patterns: Record<string, Record<number, AttendanceStatus>> = {
  usr_aarav: { 8: 'absent' },
  usr_priya: { 7: 'late' },
  usr_imran: { 2: 'absent', 9: 'absent' },
  usr_kavya: { 4: 'late' },
  usr_rohan: { 3: 'late', 6: 'absent' },
  usr_meena: {},
  usr_arjun: { 1: 'absent', 5: 'absent', 10: 'absent' },
  usr_fatima: {},
  usr_nikhil: { 0: 'absent', 1: 'absent', 3: 'absent', 4: 'absent', 6: 'late', 7: 'absent', 8: 'late', 9: 'absent' },
}

const days8A = schoolDays(12)

const attendance8A: AttendanceDay[] = days8A.map((date, dayIndex) => {
  const entries: AttendanceEntry[] = eighth.map((studentId) => ({
    studentId,
    status: patterns[studentId]?.[dayIndex] || 'present',
  }))
  return {
    id: `att_8a_${dayIndex}`,
    classId: 'cls_8a',
    subjectId: 'math',
    date,
    period: 'Full day',
    entries,
    markedBy: 'usr_meera',
    updatedAt: stamp(12 - dayIndex, 15, 30),
  }
})

const days7B = schoolDays(4)
const attendance7B: AttendanceDay[] = days7B.map((date, i) => ({
  id: `att_7b_${i}`,
  classId: 'cls_7b',
  subjectId: 'english',
  date,
  period: 'Full day',
  entries: [
    { studentId: 'usr_sonu', status: 'present' },
    { studentId: 'usr_riya', status: 'present' },
    { studentId: 'usr_deepak', status: i === 1 ? 'absent' : 'present' },
  ],
  markedBy: 'usr_ravi',
  updatedAt: stamp(4 - i, 14, 45),
}))

const days6A = schoolDays(3)
const attendance6A: AttendanceDay[] = days6A.map((date, i) => ({
  id: `att_6a_${i}`,
  classId: 'cls_6a',
  subjectId: 'hindi',
  date,
  period: 'Full day',
  entries: [
    { studentId: 'usr_tina', status: 'present' },
    { studentId: 'usr_rahul', status: i === 2 ? 'late' : 'present' },
  ],
  markedBy: 'usr_anita',
  updatedAt: stamp(3 - i, 13, 15),
}))

export const ATTENDANCE: AttendanceDay[] = [...attendance8A, ...attendance7B, ...attendance6A]

export const ASSESSMENTS: Assessment[] = [
  {
    id: 'as_math1',
    classId: 'cls_8a',
    subjectId: 'math',
    title: 'Unit test 1 — Fractions & rational numbers',
    type: 'unit-test',
    date: iso(-21),
    maxMarks: 40,
    published: true,
    graded: true,
    createdBy: 'usr_meera',
    createdAt: stamp(30, 9),
  },
  {
    id: 'as_sci1',
    classId: 'cls_8a',
    subjectId: 'science',
    title: 'Unit test 1 — Crop production',
    type: 'unit-test',
    date: iso(-14),
    maxMarks: 25,
    published: true,
    graded: true,
    createdBy: 'usr_meera',
    createdAt: stamp(25, 9),
  },
  {
    id: 'as_math2',
    classId: 'cls_8a',
    subjectId: 'math',
    title: 'Unit test 2 — Linear equations',
    type: 'unit-test',
    date: iso(-5),
    maxMarks: 40,
    published: true,
    graded: true,
    createdBy: 'usr_meera',
    createdAt: stamp(12, 9),
  },
  {
    id: 'as_social1',
    classId: 'cls_8a',
    subjectId: 'social',
    title: 'Map skills project',
    type: 'project',
    date: iso(-2),
    maxMarks: 20,
    published: false,
    graded: true,
    createdBy: 'usr_ravi',
    createdAt: stamp(8, 9),
  },
  {
    id: 'as_eng1',
    classId: 'cls_7b',
    subjectId: 'english',
    title: 'Grammar quiz — voice',
    type: 'assignment',
    date: iso(-6),
    maxMarks: 20,
    published: true,
    graded: true,
    createdBy: 'usr_ravi',
    createdAt: stamp(9, 9),
  },
]

interface MarkRow {
  studentId: string
  marks: number
}

const marksFor = (assessmentId: string, rows: MarkRow[], remarks?: Record<string, string>): Mark[] =>
  rows.map((row, i) => {
    const assessment = ASSESSMENTS.find((a) => a.id === assessmentId)!
    const pct = (row.marks / assessment.maxMarks) * 100
    return {
      id: `mk_${assessmentId}_${i}`,
      assessmentId,
      studentId: row.studentId,
      marks: row.marks,
      grade: gradeFromPercent(pct),
      remarks: remarks?.[row.studentId],
      updatedBy: assessment.createdBy,
      updatedAt: stamp(4, 17),
    }
  })

export const MARKS: Mark[] = [
  ...marksFor('as_math1', [
    { studentId: 'usr_aarav', marks: 31 },
    { studentId: 'usr_priya', marks: 36 },
    { studentId: 'usr_imran', marks: 24 },
    { studentId: 'usr_kavya', marks: 33 },
    { studentId: 'usr_rohan', marks: 28 },
    { studentId: 'usr_meena', marks: 30 },
    { studentId: 'usr_arjun', marks: 22 },
    { studentId: 'usr_fatima', marks: 35 },
    { studentId: 'usr_nikhil', marks: 18 },
  ], { usr_aarav: 'Good work on equivalent fractions. Practise word problems.', usr_nikhil: 'Please attend the revision class.' }),
  ...marksFor('as_sci1', [
    { studentId: 'usr_aarav', marks: 21 },
    { studentId: 'usr_priya', marks: 23 },
    { studentId: 'usr_imran', marks: 16 },
    { studentId: 'usr_kavya', marks: 20 },
    { studentId: 'usr_rohan', marks: 17 },
    { studentId: 'usr_meena', marks: 19 },
    { studentId: 'usr_arjun', marks: 14 },
    { studentId: 'usr_fatima', marks: 22 },
    { studentId: 'usr_nikhil', marks: 11 },
  ], { usr_aarav: 'Well labelled diagram. Revise the equation.' }),
  ...marksFor('as_math2', [
    { studentId: 'usr_aarav', marks: 34 },
    { studentId: 'usr_priya', marks: 37 },
    { studentId: 'usr_imran', marks: 27 },
    { studentId: 'usr_kavya', marks: 35 },
    { studentId: 'usr_rohan', marks: 30 },
    { studentId: 'usr_meena', marks: 32 },
    { studentId: 'usr_arjun', marks: 25 },
    { studentId: 'usr_fatima', marks: 36 },
    { studentId: 'usr_nikhil', marks: 21 },
  ], { usr_aarav: 'Clear improvement — keep showing your steps.' }),
  ...marksFor('as_social1', [
    { studentId: 'usr_aarav', marks: 16 },
    { studentId: 'usr_priya', marks: 18 },
    { studentId: 'usr_imran', marks: 13 },
    { studentId: 'usr_kavya', marks: 17 },
    { studentId: 'usr_rohan', marks: 14 },
    { studentId: 'usr_meena', marks: 15 },
    { studentId: 'usr_arjun', marks: 12 },
    { studentId: 'usr_fatima', marks: 18 },
    { studentId: 'usr_nikhil', marks: 9 },
  ]),
  ...marksFor('as_eng1', [
    { studentId: 'usr_sonu', marks: 15 },
    { studentId: 'usr_riya', marks: 17 },
    { studentId: 'usr_deepak', marks: 9 },
  ]),
]

export const LAB_RUNS: LabRun[] = [
  {
    id: 'lr_priya_frac',
    labId: 'lab_fractions',
    studentId: 'usr_priya',
    score: 3,
    maxScore: 3,
    completedAt: stamp(3, 17),
  },
  {
    id: 'lr_kavya_circuit',
    labId: 'lab_circuit',
    studentId: 'usr_kavya',
    score: 2,
    maxScore: 3,
    completedAt: stamp(2, 16),
  },
  {
    id: 'lr_rohan_ph',
    labId: 'lab_ph',
    studentId: 'usr_rohan',
    score: 2,
    maxScore: 2,
    completedAt: stamp(1, 15),
  },
]
