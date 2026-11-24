import type { Lang } from './types'

export interface StudyAnswer {
  title: string
  body: string
  steps: string[]
  followUp: string
  topic: string
}

const normalise = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}\s/]/gu, ' ').replace(/\s+/g, ' ').trim()

const TOPICS: Array<{ keys: string[]; topic: string; build: () => StudyAnswer }> = [
  {
    keys: ['fraction', 'denominator', 'numerator', '2/3', '3/5', 'half', 'रोटी', 'भिन्न'],
    topic: 'Fractions',
    build: () => ({
      title: 'Comparing fractions',
      topic: 'Fractions',
      body:
        'A fraction shows part of a whole. The denominator (bottom number) tells how many equal parts the whole is cut into, and the numerator (top number) tells how many parts you have. A larger denominator means each piece is smaller, so 1/5 is smaller than 1/3.',
      steps: [
        'To compare 2/3 and 3/5, make the denominators the same. The lowest common denominator is 15.',
        '2/3 = (2×5)/(3×5) = 10/15. And 3/5 = (3×3)/(5×3) = 9/15.',
        'Because 10 > 9, we know 10/15 > 9/15. So 2/3 is greater than 3/5.',
        'You can also cross-multiply: 2×5 = 10 and 3×3 = 9. Since 10 > 9, 2/3 is larger.',
        'Try shading two rotis cut into thirds and fifths. Which shaded area is bigger?',
      ],
      followUp: 'Can you order 1/2, 2/5 and 3/10 from smallest to largest?',
    }),
  },
  {
    keys: ['photosynthesis', 'chlorophyll', 'stomata', 'plant food', 'प्रकाश संश्लेषण'],
    topic: 'Photosynthesis',
    build: () => ({
      title: 'How plants make food',
      topic: 'Photosynthesis',
      body:
        'Photosynthesis is how green plants use sunlight, water and carbon dioxide to make glucose (food) and release oxygen. It happens in the chloroplasts, which contain the green pigment chlorophyll.',
      steps: [
        'Carbon dioxide enters the leaf through tiny pores called stomata.',
        'Water is absorbed by the roots and carried up the stem.',
        'Chlorophyll captures light energy from the sun.',
        'The plant makes glucose and releases oxygen. Word equation: carbon dioxide + water → glucose + oxygen (with sunlight and chlorophyll).',
        'At night, photosynthesis stops because there is no sunlight, but respiration continues.',
      ],
      followUp: 'Why do leaves look green? Think about which colour of light chlorophyll reflects.',
    }),
  },
  {
    keys: ['tense', 'past continuous', 'past perfect', 'was writing', 'had written', 'grammar', 'काल'],
    topic: 'Tenses',
    build: () => ({
      title: 'Past continuous and past perfect',
      topic: 'Tenses',
      body:
        'The past continuous describes an action that was in progress at a past moment. The past perfect describes an action that was completed before another past action. In “I was writing a letter when you called”, the writing was still happening when the call came, so “was writing” is correct.',
      steps: [
        'Past continuous: was/were + verb-ing. Example: She was reading when the power went out.',
        'Past perfect: had + past participle. Example: She had finished her homework before dinner.',
        'Ask: was the action still happening, or was it already complete? That decides the tense.',
        '“I had written a letter when you called” suggests the letter was already finished before the call. Different meaning.',
      ],
      followUp: 'Write one sentence about what you were doing when the school bell rang.',
    }),
  },
  {
    keys: ['water cycle', 'evaporation', 'condensation', 'rain', 'monsoon', 'जल चक्र'],
    topic: 'Water cycle',
    build: () => ({
      title: 'The water cycle',
      topic: 'Water cycle',
      body:
        'Water keeps moving between land, oceans and the air. The Sun heats surface water, plants release water vapour, the vapour cools into clouds, and the water returns as rain, snow or hail.',
      steps: [
        'Evaporation: heat turns surface water into water vapour.',
        'Transpiration: plants release water vapour through their leaves.',
        'Condensation: vapour cools high in the air and forms tiny droplets — clouds.',
        'Precipitation: droplets join and fall as rain, snow or hail.',
        'Collection: water gathers in rivers, ponds, lakes and underground.',
      ],
      followUp: 'Why can a drought follow deforestation? Think about transpiration and runoff.',
    }),
  },
  {
    keys: ['map', 'scale', 'direction', 'compass', 'नक्शा'],
    topic: 'Maps and scale',
    build: () => ({
      title: 'Reading a map scale',
      topic: 'Maps and scale',
      body:
        'A map is a drawing of a place seen from above, drawn to scale. The scale tells you how a distance on the map compares with the real distance on the ground.',
      steps: [
        'Find the scale, for example 1 cm = 25 km.',
        'Measure the distance between the two places on the map in centimetres.',
        'Multiply the map distance by the scale value: 4 cm × 25 km = 100 km.',
        'Check direction with the compass rose. North is usually at the top.',
        'Use the key or legend to understand symbols and colours.',
      ],
      followUp: 'If two towns are 3.5 cm apart on a map with scale 1 cm = 20 km, how far apart are they really?',
    }),
  },
  {
    keys: ['circuit', 'bulb', 'battery', 'current', 'conductor', 'विद्युत'],
    topic: 'Electric circuits',
    build: () => ({
      title: 'A simple circuit',
      topic: 'Electric circuits',
      body:
        'A bulb glows only when current can flow around a complete, unbroken path. The cell or battery provides the energy, wires carry the current, and the switch opens or closes the path.',
      steps: [
        'Connect the cell, switch, bulb and wires in one loop.',
        'Close the switch so the path is complete. Current flows and the bulb glows.',
        'Open the switch and the path breaks. Current stops and the bulb goes dark.',
        'Materials that let current pass are conductors (copper, iron). Rubber and plastic are insulators.',
        'Adding a second cell in the same direction increases the push, so the bulb usually glows brighter.',
      ],
      followUp: 'What would happen if you replaced the copper wire with a rubber band? Explain using the word insulator.',
    }),
  },
]

export function generateStudyAnswer(prompt: string): StudyAnswer {
  const text = normalise(prompt)
  for (const topic of TOPICS) {
    if (topic.keys.some((key) => text.includes(normalise(key)))) return topic.build()
  }
  return {
    title: 'Let us work through it',
    topic: prompt.trim().slice(0, 60) || 'Your question',
    body:
      'I could not find this exact topic in the class materials built into this demo, so I do not want to guess. Here is a reliable way to work it out, and your teacher can confirm the final answer.',
    steps: [
      'Write the question in your own words and underline the key word.',
      'Open the matching chapter in Learning Materials and look for that key word.',
      'Write what you already know, then what you are trying to find.',
      'Try one small example or diagram before solving the full question.',
      'If you are still stuck, send it to Doubt Support so your teacher can reply.',
    ],
    followUp: 'Which subject and chapter is this from? That will help me give a closer answer.',
  }
}

const cleanTopic = (topic: string) => topic.trim().replace(/\s+/g, ' ').slice(0, 90) || 'the topic'

export function generateTeacherDraft(kind: 'lesson' | 'questions' | 'revision' | 'simpler', topic: string, grade: number): string {
  const t = cleanTopic(topic)
  if (kind === 'lesson') {
    return `Lesson plan draft — ${t} (Class ${grade})
AI DRAFT · REVIEW BEFORE USE

Learning objective
By the end of the lesson, students can explain ${t} in their own words and apply it to one everyday example.

Prior knowledge (5 min)
Ask two quick questions about the previous chapter. Note students who need support.

Introduction (7 min)
Start with a local, concrete example connected to ${t}. Ask students to predict what will happen.

Guided practice (15 min)
1. Explain the key idea in three short steps.
2. Work one example together on the board.
3. Ask pairs to explain the idea to each other in their own language.

Independent practice (10 min)
Students solve two short tasks. Walk around and note common mistakes.

Check for understanding (5 min)
Exit ticket: one question on ${t}. Review answers before the next class.

Homework
One short practice task, plus reading the matching notes in Learning Materials.

Low-data alternative
Use the board and the printed note; no video needed.

Teacher notes
This draft is a starting point. Adapt the examples to your village and your students.`
  }
  if (kind === 'questions') {
    return `Practice questions draft — ${t} (Class ${grade})
AI DRAFT · REVIEW BEFORE USE

1. Define ${t} in one sentence.
2. Give one everyday example of ${t} and explain it.
3. True or false: ${t} works the same way in every situation. Justify your answer.
4. Apply: describe what would happen if one condition related to ${t} changed.
5. Draw and label a simple diagram showing ${t}.
6. Short answer: why does ${t} matter outside the classroom?

Answer guidance
Check definitions for the key terms, look for a correct example, and accept clear reasoning in the students' own words. Add marks for correct use of subject vocabulary.

Teacher notes
Edit the wording to match your textbook. Add a fill-in-the-blank version for students who need more support.`
  }
  if (kind === 'revision') {
    return `Revision notes draft — ${t} (Class ${grade})
AI DRAFT · REVIEW BEFORE USE

Key idea
${t} can be understood by breaking it into a cause, a process and a result.

Must-know terms
• Definition of ${t}
• Two examples
• One diagram or flow chart
• One common mistake to avoid

Quick recap
1. What is ${t}?
2. Why does it happen?
3. Where can you see it in daily life?
4. What is one exam-style question on it?

Memory aid
Turn the process into three short steps and practise saying them aloud.

Teacher notes
Check that the terms match the state textbook before sharing.`
  }
  return `Simpler explanation draft — ${t} (Class ${grade})
AI DRAFT · REVIEW BEFORE USE

Start with a familiar object or action.

Say it in three steps:
1. This is what ${t} means.
2. This is how it works.
3. This is why it matters.

Use one picture or one everyday example. Avoid new vocabulary until the idea is clear. Then ask the student to explain it back in their own language.

Teacher notes
Add the local-language version with a colleague before printing.`
}

/** The demo assistant never claims to be a live cloud model. */
export const demoAssistantNote = (lang: Lang): string =>
  lang === 'hi'
    ? 'यह डेमो सहायक इस डिवाइस पर एक छोटे नियम-आधारित मॉडल से चलता है। कोई बाहरी AI सेवा जुड़ी नहीं है।'
    : 'This demo assistant runs on-device with a small rule-based model. No external AI provider is connected.'
