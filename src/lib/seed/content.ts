import type { Attempt, ClassSession, Quiz, Recording, Resource } from '../types'
import { iso, stamp } from './helpers'

export const SESSIONS: ClassSession[] = [
  {
    id: 'ses_8a_frac',
    classId: 'cls_8a',
    subjectId: 'math',
    title: 'Fractions: comparing and ordering',
    description: 'We will compare fractions with different denominators and place them on a number line. Keep your Maths notebook ready.',
    date: iso(1),
    startTime: '10:00',
    durationMin: 45,
    teacherId: 'usr_meera',
    status: 'scheduled',
    demoRoom: true,
    zoomLink: 'demo://classroom/ses_8a_frac',
    resourceIds: ['res_frac_note', 'res_frac_revision'],
    recordingIds: [],
    createdAt: stamp(2, 14),
  },
  {
    id: 'ses_8a_photo',
    classId: 'cls_8a',
    subjectId: 'science',
    title: 'Photosynthesis in plants',
    description: 'A live walkthrough of the photosynthesis equation with a leaf experiment you can try at home.',
    date: iso(2),
    startTime: '11:30',
    durationMin: 40,
    teacherId: 'usr_meera',
    status: 'scheduled',
    demoRoom: true,
    zoomLink: 'demo://classroom/ses_8a_photo',
    resourceIds: ['res_photo_note'],
    recordingIds: [],
    createdAt: stamp(2, 15),
  },
  {
    id: 'ses_8a_tenses',
    classId: 'cls_8a',
    subjectId: 'english',
    title: 'Tenses in everyday writing',
    description: 'Bring a short paragraph about your village. We will edit it together.',
    date: iso(4),
    startTime: '10:00',
    durationMin: 45,
    teacherId: 'usr_ravi',
    status: 'scheduled',
    zoomLink: '',
    resourceIds: ['res_eng_note'],
    recordingIds: [],
    createdAt: stamp(1, 16),
  },
  {
    id: 'ses_8a_revision',
    classId: 'cls_8a',
    subjectId: 'math',
    title: 'Doubt clearing: fractions and decimals',
    description: 'An open session for questions before the unit test.',
    date: iso(3),
    startTime: '16:00',
    durationMin: 30,
    teacherId: 'usr_meera',
    status: 'scheduled',
    demoRoom: true,
    zoomLink: 'demo://classroom/ses_8a_revision',
    resourceIds: [],
    recordingIds: [],
    createdAt: stamp(1, 17),
  },
  {
    id: 'ses_8a_rat',
    classId: 'cls_8a',
    subjectId: 'math',
    title: 'Rational numbers revision',
    description: 'Recap of the rules for adding and subtracting rational numbers.',
    date: iso(-3),
    startTime: '10:00',
    durationMin: 38,
    teacherId: 'usr_meera',
    status: 'completed',
    demoRoom: true,
    zoomLink: 'demo://classroom/ses_8a_rat',
    resourceIds: ['res_frac_note'],
    recordingIds: ['rec_frac'],
    createdAt: stamp(5, 9),
  },
  {
    id: 'ses_8a_crop',
    classId: 'cls_8a',
    subjectId: 'science',
    title: 'Crop production and management',
    description: 'How farmers in Sitapur prepare fields, choose seeds and protect crops.',
    date: iso(-7),
    startTime: '11:30',
    durationMin: 42,
    teacherId: 'usr_meera',
    status: 'completed',
    demoRoom: true,
    zoomLink: 'demo://classroom/ses_8a_crop',
    resourceIds: ['res_photo_note'],
    recordingIds: ['rec_photo'],
    createdAt: stamp(9, 8),
  },
  {
    id: 'ses_8a_maps',
    classId: 'cls_8a',
    subjectId: 'social',
    title: 'Reading maps and scales',
    description: 'A practical session on directions, scale and symbols.',
    date: iso(-10),
    startTime: '12:00',
    durationMin: 40,
    teacherId: 'usr_ravi',
    status: 'completed',
    zoomLink: '',
    resourceIds: ['res_social_note'],
    recordingIds: [],
    createdAt: stamp(12, 10),
  },
  {
    id: 'ses_7b_voice',
    classId: 'cls_7b',
    subjectId: 'english',
    title: 'Active and passive voice',
    description: 'Practise changing sentences without changing their meaning.',
    date: iso(1),
    startTime: '09:00',
    durationMin: 40,
    teacherId: 'usr_ravi',
    status: 'scheduled',
    zoomLink: '',
    resourceIds: ['res_7b_note'],
    recordingIds: [],
    createdAt: stamp(2, 11),
  },
  {
    id: 'ses_7b_poem',
    classId: 'cls_7b',
    subjectId: 'english',
    title: 'Poetry reading: The Road Not Taken',
    description: 'Reading, meaning and discussion.',
    date: iso(-4),
    startTime: '09:00',
    durationMin: 35,
    teacherId: 'usr_ravi',
    status: 'completed',
    demoRoom: true,
    zoomLink: 'demo://classroom/ses_7b_poem',
    resourceIds: [],
    recordingIds: ['rec_eng'],
    createdAt: stamp(6, 12),
  },
  {
    id: 'ses_6a_hindi',
    classId: 'cls_6a',
    subjectId: 'hindi',
    title: 'सर्वनाम और क्रिया',
    description: 'कक्षा में सर्वनाम के प्रयोग का अभ्यास।',
    date: iso(1),
    startTime: '12:00',
    durationMin: 40,
    teacherId: 'usr_anita',
    status: 'scheduled',
    zoomLink: '',
    resourceIds: ['res_6a_note'],
    recordingIds: [],
    createdAt: stamp(2, 13),
  },
  {
    id: 'ses_6a_pronoun',
    classId: 'cls_6a',
    subjectId: 'hindi',
    title: 'संज्ञा और सर्वनाम की पहचान',
    description: 'वाक्यों में संज्ञा और सर्वनाम पहचानने का अभ्यास।',
    date: iso(-6),
    startTime: '12:00',
    durationMin: 32,
    teacherId: 'usr_anita',
    status: 'completed',
    demoRoom: true,
    zoomLink: 'demo://classroom/ses_6a_pronoun',
    resourceIds: [],
    recordingIds: ['rec_hindi'],
    createdAt: stamp(8, 12),
  },
]

/** CC0 sample clip used only to prove the player works. Clearly labelled in the UI. */
const SAMPLE_MEDIA = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

export const RECORDINGS: Recording[] = [
  {
    id: 'rec_frac',
    classId: 'cls_8a',
    subjectId: 'math',
    sessionId: 'ses_8a_rat',
    title: 'Rational numbers revision',
    chapter: 'Rational numbers',
    teacherId: 'usr_meera',
    date: iso(-3),
    durationMin: 38,
    sizeMB: 42,
    mediaUrl: SAMPLE_MEDIA,
    downloadEnabled: true,
    source: 'zoom',
    description: 'Sample demonstration clip. Replace with the real class recording from your Zoom cloud or school storage.',
    language: 'en',
    status: 'ready',
  },
  {
    id: 'rec_photo',
    classId: 'cls_8a',
    subjectId: 'science',
    sessionId: 'ses_8a_crop',
    title: 'Crop production and management',
    chapter: 'Crop production',
    teacherId: 'usr_meera',
    date: iso(-7),
    durationMin: 42,
    sizeMB: 51,
    mediaUrl: '',
    downloadEnabled: false,
    source: 'zoom',
    description: 'The Zoom cloud recording is still with the school ICT coordinator. Media has not been uploaded yet.',
    language: 'en',
    status: 'ready',
  },
  {
    id: 'rec_eng',
    classId: 'cls_7b',
    subjectId: 'english',
    sessionId: 'ses_7b_poem',
    title: 'Poetry reading: The Road Not Taken',
    chapter: 'Poetry',
    teacherId: 'usr_ravi',
    date: iso(-4),
    durationMin: 35,
    sizeMB: 38,
    mediaUrl: '',
    downloadEnabled: true,
    source: 'zoom',
    description: 'Recording is still processing at the provider. It will appear here when ready.',
    language: 'en',
    status: 'processing',
  },
  {
    id: 'rec_hindi',
    classId: 'cls_6a',
    subjectId: 'hindi',
    sessionId: 'ses_6a_pronoun',
    title: 'संज्ञा और सर्वनाम की पहचान',
    chapter: 'व्याकरण',
    teacherId: 'usr_anita',
    date: iso(-6),
    durationMin: 32,
    sizeMB: 30,
    mediaUrl: '',
    downloadEnabled: false,
    source: 'zoom',
    description: 'रिकॉर्डिंग अपलोड होने के बाद यहाँ उपलब्ध होगी।',
    language: 'hi',
    status: 'ready',
  },
  {
    id: 'rec_frac2',
    classId: 'cls_8a',
    subjectId: 'math',
    title: 'Comparing fractions',
    chapter: 'Fractions',
    teacherId: 'usr_meera',
    date: iso(-12),
    durationMin: 33,
    sizeMB: 36,
    mediaUrl: '',
    downloadEnabled: true,
    source: 'upload',
    description: 'Whiteboard walkthrough of cross multiplication.',
    language: 'en',
    status: 'ready',
  },
]

const fractionsNote = `Fractions — comparing and ordering

A fraction shows a part of a whole. In 3/4, the denominator 4 tells us how many equal parts the whole is divided into, and the numerator 3 tells us how many parts we have.

1. Equivalent fractions
Multiply or divide both the numerator and the denominator by the same number.
3/4 = (3×2)/(4×2) = 6/8

2. Comparing fractions with the same denominator
The fraction with the larger numerator is greater: 5/8 > 3/8.

3. Comparing fractions with different denominators
Method A — common denominator: 2/3 and 3/5 become 10/15 and 9/15, so 2/3 > 3/5.
Method B — cross multiplication: 2×5 = 10 and 3×3 = 9. Since 10 > 9, 2/3 > 3/5.

4. Ordering on a number line
Convert each fraction to a decimal or a common denominator, then mark them from left to right. Smaller fractions sit closer to zero.

Practice
• Arrange 1/2, 2/5 and 3/10 from smallest to largest.
• Is 4/6 equal to 2/3? Explain using equivalent fractions.
• A roti is cut into 8 equal pieces. You eat 3. What fraction is left?

Remember: the denominator cannot be zero. A fraction greater than 1 can also be written as a mixed number: 7/4 = 1¾.`

const photoNote = `Photosynthesis — how plants make their own food

Photosynthesis is the process by which green plants use sunlight, water and carbon dioxide to make glucose (food) and release oxygen.

Word equation
Carbon dioxide + Water --(sunlight, chlorophyll)--> Glucose + Oxygen

Balanced equation
6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂

Where it happens
Chloroplasts inside leaf cells. The green pigment chlorophyll absorbs light energy.

What is needed
1. Carbon dioxide — enters through tiny pores called stomata.
2. Water — absorbed by roots and carried up through the stem.
3. Sunlight — absorbed by chlorophyll.
4. Chlorophyll — the green pigment.

What is produced
Glucose is used for growth or stored as starch. Oxygen leaves through the stomata.

Why it matters
Photosynthesis produces the oxygen we breathe and is the starting point of almost every food chain. It also removes carbon dioxide from the air.

Think about it
• Why do leaves look green?
• What happens to photosynthesis at night?
• A plant kept in a dark cupboard for a week turns pale. Why?

Activity: place a leaf in sunlight for a day, then cover part of it with black paper for two days and test for starch with iodine (teacher supervision).`

const tensesNote = `Tenses made simple

Tense tells us when an action happens: past, present or future. Each has simple, continuous, perfect and perfect continuous forms.

Simple present — habits and facts
She walks to school every day. / They play cricket on Sundays.

Present continuous — happening now
She is reading a book. / They are waiting for the bus.

Simple past — finished actions
He visited his grandmother yesterday. / We finished the project last week.

Past continuous — an action in progress in the past
I was studying when the power went out.

Present perfect — past action with a present result
She has finished her homework. (So she is free now.)

Future — plans and predictions
We will visit the science fair tomorrow. / It is going to rain.

Common mistakes
✗ She go to school. → ✓ She goes to school.
✗ I am knowing the answer. → ✓ I know the answer.
✗ He did not went. → ✓ He did not go.

Practice
Underline the verb and name the tense:
1. The farmer is ploughing his field.
2. We have lived here for six years.
3. They will sing at the assembly.
4. I was writing a letter when you called.

Writing task: describe your morning routine in five sentences using the simple present. Then rewrite it in the simple past.`

const waterNote = `The water cycle

Water moves between the land, oceans and atmosphere in a continuous cycle.

Evaporation: heat from the sun turns surface water into water vapour.
Transpiration: plants release water vapour through their leaves.
Condensation: water vapour cools high in the atmosphere and forms tiny droplets, making clouds.
Precipitation: droplets join and fall as rain, snow or hail.
Collection: water gathers in rivers, lakes, ponds and underground.

Key terms
• Groundwater — water stored in spaces between soil and rock.
• Infiltration — movement of water down into the soil.
• Runoff — water that flows over the surface into streams.

Why it matters
The water cycle refills rivers and wells, moves heat around the planet and supplies fresh water for farming, drinking and industry.

In Sitapur: the monsoon rains fill ponds in July and August. When trees are cut down, less transpiration and more runoff can dry the soil faster.

Check yourself
1. What happens to water vapour when it cools?
2. Name two ways water returns to the atmosphere.
3. Why can a drought follow deforestation?`

const mapNote = `Reading maps and scales

A map is a drawing of a place seen from above, drawn to scale.

Essential parts
1. Title — what the map shows.
2. Scale — the relation between map distance and real distance. 1 cm = 5 km means 2 cm on the map is 10 km on the ground.
3. Direction — north is usually at the top. A compass rose shows N, E, S, W.
4. Key or legend — explains symbols and colours.
5. Grid — lines of latitude and longitude help locate places.

Types of maps
• Physical maps show mountains, rivers and plains.
• Political maps show states, districts and boundaries.
• Thematic maps show rainfall, crops, population or soil.

Measuring distance
If the scale is 1 cm = 25 km and two towns are 4 cm apart on the map, the real distance is 4 × 25 = 100 km.

Practice with the school map
1. Which direction is the playground from your classroom?
2. Measure the distance between Rampur and Bela in cm, then convert it using the map scale.
3. Find the symbol for a post office in the key.

Remember: a large-scale map shows a small area with more detail; a small-scale map shows a large area with less detail.`

const crowStory = `The Clever Crow / चतुर कौआ

One hot afternoon, a crow named Kalu was flying over a field in Rampur. He was very thirsty. His wings felt heavy and his throat was dry.

He looked everywhere. At last he saw a clay pot near a banyan tree. He flew down and looked inside. There was water at the bottom, but it was too low for his beak.

Kalu did not give up. He looked around and saw small pebbles near the wall. One by one, he picked them up and dropped them into the pot. Slowly, the water rose. Soon it was high enough to drink.

"Little by little," thought Kalu, "we can solve a big problem."

Moral: Patience and clever thinking are stronger than force.

एक गर्म दोपहर में कालू नाम का कौआ रामपुर के खेतों के ऊपर उड़ रहा था। उसे बहुत प्यास लगी थी।

उसने चारों ओर देखा। आख़िरकार उसे बरगद के पेड़ के पास एक मटका दिखा। वह नीचे उतरा और मटके में झाँका। नीचे थोड़ा पानी था, पर उसकी चोंच तक नहीं पहुँच रहा था।

कालू ने हार नहीं मानी। उसने पास में छोटे-छोटे कंकड़ देखे। एक-एक करके उसने कंकड़ उठाए और मटके में डाले। धीरे-धीरे पानी ऊपर आ गया। अब वह पानी पी सका।

सीख: धैर्य और समझदारी ताक़त से बड़ी होती है।`

const mangoStory = `The Mango Tree Mystery

Every June, the giant mango tree behind the Bela school filled with fruit. Every June, the fruit disappeared before the children could count it.

"Someone is stealing our mangoes," said Riya.

"It must be the monkeys," said Deepak.

But Sonu had a different idea. She sat under the tree after school with a notebook. She drew a map of footprints, counted broken twigs and listened.

At dusk, a small boy crept in with a cloth bag. He was from the village on the other side of the canal. His mother was ill, and she had asked for raw mangoes to make a cooling drink.

The children did not chase him away. They spoke to the head teacher. The next day, the school arranged a small basket of fruit for every family in need, and the boy joined the school's gardening club.

Moral: A good question can turn a mystery into a friendship.`

const leavesStory = `Why leaves change colour

In summer, leaves look green because chlorophyll hides the other pigments. When autumn comes, shorter days and cooler nights break chlorophyll down. The yellow and orange pigments (carotenoids) that were there all along become visible. In some trees, red anthocyanins form from sugars trapped in the leaf.

This is why a single tree can show green, gold, orange and red in the same week. The tree is pulling useful nutrients back into its branches before the old leaves fall.

Try this: collect three leaves of different colours from the same tree. Compare their shapes and veins in your notebook.`

const hindiNote = `संधि और समास

संधि
दो वर्णों के मेल से होने वाले परिवर्तन को संधि कहते हैं।
विद्या + आलय = विद्यालय (आ + आ = आ)
सूर्य + उदय = सूर्योदय (अ + उ = ओ)

संधि के भेद
स्वर संधि — स्वरों का मेल (राम + अवतार = रामावतार)
व्यंजन संधि — व्यंजन का मेल (सत् + जन = सज्जन)
विसर्ग संधि — विसर्ग का लोप (निः + चय = निश्चय)

समास
दो या अधिक शब्दों के मेल से बने शब्द को समास कहते हैं।
राजपुत्र = राजा का पुत्र (तत्पुरुष)
चतुर्मुख = चार मुखों वाला (बहुव्रीहि)
यथाशक्ति = शक्ति के अनुसार (अव्ययीभाव)

अभ्यास
1. निम्नलिखित का संधि-विच्छेद करें: विद्यार्थी, सूर्योदय, सदैव।
2. समास-विच्छेद करें: पीतांबर, दशानन, गजानन।
3. अपने गाँव के नाम से दो समास वाले शब्द बनाइए।`

export const RESOURCES: Resource[] = [
  {
    id: 'res_frac_note',
    title: 'Fractions: comparing and ordering',
    description: 'Class notes with worked examples, number-line practice and a short exercise set.',
    type: 'note',
    classId: 'cls_8a',
    subjectId: 'math',
    chapter: 'Fractions',
    topics: ['equivalent fractions', 'comparing', 'number line'],
    languages: ['en', 'hi'],
    sizeKB: 420,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_meera',
    uploadedAt: stamp(8, 18),
    content: fractionsNote,
    pages: 6,
    gradeLevels: [7, 8],
  },
  {
    id: 'res_frac_revision',
    title: 'Fractions revision sheet',
    description: 'One-page revision: rules, common mistakes and ten practice questions.',
    type: 'revision',
    classId: 'cls_8a',
    subjectId: 'math',
    chapter: 'Fractions',
    topics: ['revision', 'practice'],
    languages: ['en', 'hi'],
    sizeKB: 260,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_meera',
    uploadedAt: stamp(7, 17),
    content: fractionsNote,
    pages: 2,
    gradeLevels: [8],
  },
  {
    id: 'res_photo_note',
    title: 'Photosynthesis: how plants make food',
    description: 'Diagram-free notes that load quickly, with the equation and a home activity.',
    type: 'note',
    classId: 'cls_8a',
    subjectId: 'science',
    chapter: 'Photosynthesis',
    topics: ['chlorophyll', 'stomata', 'glucose'],
    languages: ['en', 'hi'],
    sizeKB: 380,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_meera',
    uploadedAt: stamp(6, 16),
    content: photoNote,
    pages: 5,
    gradeLevels: [7, 8],
  },
  {
    id: 'res_water_note',
    title: 'The water cycle',
    description: 'Evaporation, condensation, precipitation and collection, with local examples.',
    type: 'note',
    classId: 'cls_8a',
    subjectId: 'science',
    chapter: 'Water',
    topics: ['water cycle', 'monsoon', 'groundwater'],
    languages: ['en', 'hi'],
    sizeKB: 300,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_meera',
    uploadedAt: stamp(15, 10),
    content: waterNote,
    pages: 4,
    gradeLevels: [7, 8],
  },
  {
    id: 'res_math_book',
    title: 'NCERT Class 8 Mathematics — Chapter 2',
    description: 'Linear equations in one variable. Full chapter, scanned at low resolution for smaller downloads.',
    type: 'textbook',
    classId: 'cls_8a',
    subjectId: 'math',
    chapter: 'Linear equations',
    topics: ['equations', 'textbook'],
    languages: ['en', 'hi'],
    sizeKB: 2600,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_meera',
    uploadedAt: stamp(40, 9),
    pages: 28,
    gradeLevels: [8],
  },
  {
    id: 'res_sci_book',
    title: 'NCERT Class 8 Science — Crop production',
    description: 'Chapter 1 textbook pages, with the exercise questions included.',
    type: 'textbook',
    classId: 'cls_8a',
    subjectId: 'science',
    chapter: 'Crop production',
    topics: ['agriculture', 'textbook'],
    languages: ['en', 'hi'],
    sizeKB: 3100,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_meera',
    uploadedAt: stamp(38, 9),
    pages: 32,
    gradeLevels: [8],
  },
  {
    id: 'res_math_paper',
    title: 'Half-yearly model paper — Mathematics',
    description: 'Blue-print based model paper with 30 questions and a marking scheme.',
    type: 'question-paper',
    classId: 'cls_8a',
    subjectId: 'math',
    chapter: 'Half-yearly',
    topics: ['model paper', 'revision'],
    languages: ['en', 'hi'],
    sizeKB: 640,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_meera',
    uploadedAt: stamp(20, 11),
    pages: 8,
    gradeLevels: [8],
  },
  {
    id: 'res_sci_paper',
    title: 'Unit test model paper — Science',
    description: 'Draft paper for the next science unit test. Not yet published.',
    type: 'question-paper',
    classId: 'cls_8a',
    subjectId: 'science',
    chapter: 'Unit test 2',
    topics: ['model paper'],
    languages: ['en'],
    sizeKB: 480,
    downloadable: true,
    published: false,
    uploadedBy: 'usr_meera',
    uploadedAt: stamp(1, 19),
    pages: 6,
    gradeLevels: [8],
  },
  {
    id: 'res_sci_mcq',
    title: 'Science MCQ practice set (40 questions)',
    description: 'Objective practice covering chapters 1–6. Answers on the last page.',
    type: 'mcq-set',
    classId: 'cls_8a',
    subjectId: 'science',
    chapter: 'Term 1',
    topics: ['MCQ', 'practice'],
    languages: ['en', 'hi'],
    sizeKB: 220,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_meera',
    uploadedAt: stamp(12, 15),
    pages: 4,
    gradeLevels: [8],
  },
  {
    id: 'res_eng_note',
    title: 'Tenses made simple',
    description: 'All twelve tenses with examples, common mistakes and a writing task.',
    type: 'note',
    classId: 'cls_8a',
    subjectId: 'english',
    chapter: 'Grammar: Tenses',
    topics: ['present', 'past', 'future', 'grammar'],
    languages: ['en'],
    sizeKB: 340,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_ravi',
    uploadedAt: stamp(9, 14),
    content: tensesNote,
    pages: 5,
    gradeLevels: [7, 8],
  },
  {
    id: 'res_tenses_fill',
    title: 'Tenses fill-in-the-blank practice',
    description: 'Twenty sentences to complete with the correct verb form. Answers provided.',
    type: 'fill-blanks',
    classId: 'cls_8a',
    subjectId: 'english',
    chapter: 'Grammar: Tenses',
    topics: ['worksheet'],
    languages: ['en'],
    sizeKB: 150,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_ravi',
    uploadedAt: stamp(8, 12),
    pages: 2,
    gradeLevels: [8],
  },
  {
    id: 'res_hindi_note',
    title: 'संधि और समास',
    description: 'संधि और समास के भेद, उदाहरण और अभ्यास प्रश्न।',
    type: 'note',
    classId: 'cls_8a',
    subjectId: 'hindi',
    chapter: 'व्याकरण',
    topics: ['संधि', 'समास'],
    languages: ['hi'],
    sizeKB: 410,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_anita',
    uploadedAt: stamp(11, 10),
    content: hindiNote,
    pages: 6,
    gradeLevels: [8],
  },
  {
    id: 'res_social_note',
    title: 'Reading maps and scales',
    description: 'Map elements, scale conversion and local practice questions.',
    type: 'note',
    classId: 'cls_8a',
    subjectId: 'social',
    chapter: 'Maps',
    topics: ['scale', 'direction', 'symbols'],
    languages: ['en', 'hi'],
    sizeKB: 380,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_ravi',
    uploadedAt: stamp(14, 9),
    content: mapNote,
    pages: 4,
    gradeLevels: [8],
  },
  {
    id: 'res_story_crow',
    title: 'The Clever Crow / चतुर कौआ',
    description: 'A short bilingual story about patience and clever thinking.',
    type: 'storybook',
    classId: 'cls_8a',
    subjectId: 'english',
    chapter: 'Story time',
    topics: ['story', 'values', 'bilingual'],
    languages: ['en', 'hi'],
    sizeKB: 180,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_ravi',
    uploadedAt: stamp(30, 9),
    content: crowStory,
    pages: 4,
    gradeLevels: [5, 6, 7, 8],
  },
  {
    id: 'res_story_mango',
    title: 'The Mango Tree Mystery',
    description: 'A mystery story set in a village school, with a gentle lesson about kindness.',
    type: 'storybook',
    classId: 'cls_8a',
    subjectId: 'english',
    chapter: 'Story time',
    topics: ['story', 'mystery'],
    languages: ['en'],
    sizeKB: 260,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_ravi',
    uploadedAt: stamp(25, 10),
    content: mangoStory,
    pages: 6,
    gradeLevels: [6, 7, 8],
  },
  {
    id: 'res_supp_leaves',
    title: 'Why leaves change colour',
    description: 'Supplementary science reading with a simple observation activity.',
    type: 'supplementary',
    classId: 'cls_8a',
    subjectId: 'science',
    chapter: 'Plants',
    topics: ['reading', 'chlorophyll'],
    languages: ['en', 'hi'],
    sizeKB: 200,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_meera',
    uploadedAt: stamp(22, 11),
    content: leavesStory,
    pages: 3,
    gradeLevels: [7, 8],
  },
  {
    id: 'res_7b_note',
    title: 'Active and passive voice',
    description: 'Rules and practice for Class 7B.',
    type: 'note',
    classId: 'cls_7b',
    subjectId: 'english',
    chapter: 'Grammar: Voice',
    topics: ['active', 'passive'],
    languages: ['en', 'hi'],
    sizeKB: 320,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_ravi',
    uploadedAt: stamp(5, 13),
    pages: 4,
    gradeLevels: [7],
  },
  {
    id: 'res_6a_note',
    title: 'सर्वनाम और क्रिया',
    description: 'कक्षा 6 के लिए सरल भाषा में व्याकरण नोट्स।',
    type: 'note',
    classId: 'cls_6a',
    subjectId: 'hindi',
    chapter: 'व्याकरण',
    topics: ['सर्वनाम', 'क्रिया'],
    languages: ['hi'],
    sizeKB: 290,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_anita',
    uploadedAt: stamp(10, 12),
    pages: 3,
    gradeLevels: [6],
  },
  {
    id: 'res_7b_revision',
    title: 'Term 1 revision: Social Science',
    description: 'Quick revision of maps, resources and the Constitution.',
    type: 'revision',
    classId: 'cls_7b',
    subjectId: 'social',
    chapter: 'Term 1',
    topics: ['revision'],
    languages: ['en', 'hi'],
    sizeKB: 340,
    downloadable: true,
    published: true,
    uploadedBy: 'usr_ravi',
    uploadedAt: stamp(6, 15),
    pages: 5,
    gradeLevels: [7],
  },
]

export const QUIZZES: Quiz[] = [
  {
    id: 'quiz_frac',
    classId: 'cls_8a',
    subjectId: 'math',
    title: 'Fractions checkpoint',
    instructions:
      'You have 15 minutes and 2 attempts. Read each question carefully. Fill-in-the-blank answers are checked for spelling, so write the simplest form. You will see your score and explanations immediately after submitting.',
    published: true,
    openAt: iso(-3),
    dueAt: iso(5),
    showResults: 'immediately',
    showAnswers: true,
    attemptsAllowed: 2,
    timeLimitMin: 15,
    createdBy: 'usr_meera',
    createdAt: stamp(5, 8),
    language: 'en',
    questions: [
      {
        id: 'q_frac_1',
        type: 'mcq',
        prompt: 'Which fraction is equivalent to 3/4?',
        options: ['6/8', '4/6', '3/8', '2/3'],
        answer: '6/8',
        explanation: 'Multiply the numerator and denominator by the same number: (3×2)/(4×2) = 6/8.',
        points: 2,
      },
      {
        id: 'q_frac_2',
        type: 'mcq',
        prompt: 'What is 1/2 + 1/4?',
        options: ['3/4', '2/6', '1/6', '2/4'],
        answer: '3/4',
        explanation: '1/2 = 2/4, so 2/4 + 1/4 = 3/4.',
        points: 2,
      },
      {
        id: 'q_frac_3',
        type: 'fill',
        prompt: 'Write 0.5 as a fraction in its simplest form.',
        answer: '1/2',
        accept: ['1/2', '½', 'one half'],
        explanation: '0.5 means 5/10. Dividing both parts by 5 gives 1/2.',
        points: 2,
      },
      {
        id: 'q_frac_4',
        type: 'mcq',
        prompt: 'Which is greater: 2/3 or 3/5?',
        options: ['2/3', '3/5', 'They are equal', 'Cannot be compared'],
        answer: '2/3',
        explanation: 'Cross multiply: 2×5 = 10 and 3×3 = 9. Because 10 > 9, 2/3 is greater.',
        points: 2,
      },
    ],
  },
  {
    id: 'quiz_photo',
    classId: 'cls_8a',
    subjectId: 'science',
    title: 'Photosynthesis quick check',
    instructions:
      'Three short questions, 8 minutes, one attempt. Results and correct answers will be released after the due date.',
    published: true,
    openAt: iso(-1),
    dueAt: iso(7),
    showResults: 'after_due',
    showAnswers: false,
    attemptsAllowed: 1,
    timeLimitMin: 8,
    createdBy: 'usr_meera',
    createdAt: stamp(1, 7),
    language: 'en',
    questions: [
      {
        id: 'q_ph_1',
        type: 'mcq',
        prompt: 'Which gas do plants take in during photosynthesis?',
        options: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'],
        answer: 'Carbon dioxide',
        explanation: 'Carbon dioxide enters the leaf through stomata and is used to make glucose.',
        points: 2,
      },
      {
        id: 'q_ph_2',
        type: 'mcq',
        prompt: 'Where does photosynthesis mainly happen inside a plant cell?',
        options: ['Chloroplast', 'Nucleus', 'Mitochondria', 'Cell wall'],
        answer: 'Chloroplast',
        explanation: 'Chloroplasts contain chlorophyll, which captures light energy.',
        points: 2,
      },
      {
        id: 'q_ph_3',
        type: 'fill',
        prompt: 'The green pigment that captures light is ______.',
        answer: 'chlorophyll',
        accept: ['chlorophyll', 'chlorophyl'],
        explanation: 'Chlorophyll absorbs mainly red and blue light and reflects green light, which is why leaves look green.',
        points: 2,
      },
    ],
  },
  {
    id: 'quiz_tenses',
    classId: 'cls_8a',
    subjectId: 'english',
    title: 'Tenses practice',
    instructions: 'Draft — not visible to students yet.',
    published: false,
    openAt: iso(2),
    dueAt: iso(9),
    showResults: 'manual',
    showAnswers: true,
    attemptsAllowed: 2,
    timeLimitMin: 10,
    createdBy: 'usr_ravi',
    createdAt: stamp(0, 8),
    language: 'en',
    questions: [
      {
        id: 'q_t_1',
        type: 'mcq',
        prompt: 'Choose the correct sentence.',
        options: ['She goes to school every day.', 'She go to school every day.', 'She going to school every day.', 'She gone to school every day.'],
        answer: 'She goes to school every day.',
        explanation: 'With he, she or it in the simple present, add -s or -es to the verb.',
        points: 1,
      },
      {
        id: 'q_t_2',
        type: 'fill',
        prompt: 'Complete: They ______ (play) cricket when it started raining.',
        answer: 'were playing',
        accept: ['were playing'],
        explanation: 'The past continuous describes an action in progress when another action happened.',
        points: 1,
      },
    ],
  },
]

const graded = (id: string, quizId: string, studentId: string, answers: Record<string, string>, score: number, daysAgo: number): Attempt => ({
  id,
  quizId,
  studentId,
  answers,
  score,
  maxScore: 8,
  autoGraded: true,
  submittedAt: stamp(daysAgo, 16, 20),
})

export const ATTEMPTS: Attempt[] = [
  graded(
    'att_priya_frac',
    'quiz_frac',
    'usr_priya',
    { q_frac_1: '6/8', q_frac_2: '3/4', q_frac_3: '1/2', q_frac_4: '2/3' },
    8,
    2,
  ),
  graded(
    'att_imran_frac',
    'quiz_frac',
    'usr_imran',
    { q_frac_1: '4/6', q_frac_2: '3/4', q_frac_3: '1/2', q_frac_4: '3/5' },
    4,
    2,
  ),
  graded(
    'att_kavya_frac',
    'quiz_frac',
    'usr_kavya',
    { q_frac_1: '6/8', q_frac_2: '3/4', q_frac_3: '0.5', q_frac_4: '2/3' },
    6,
    1,
  ),
  graded(
    'att_rohan_frac',
    'quiz_frac',
    'usr_rohan',
    { q_frac_1: '6/8', q_frac_2: '2/6', q_frac_3: '1/2', q_frac_4: '2/3' },
    6,
    1,
  ),
  {
    id: 'att_priya_photo',
    quizId: 'quiz_photo',
    studentId: 'usr_priya',
    answers: { q_ph_1: 'Carbon dioxide', q_ph_2: 'Chloroplast', q_ph_3: 'chlorophyll' },
    score: 6,
    maxScore: 6,
    autoGraded: true,
    submittedAt: stamp(1, 18, 5),
  },
  {
    id: 'att_fatima_photo',
    quizId: 'quiz_photo',
    studentId: 'usr_fatima',
    answers: { q_ph_1: 'Carbon dioxide', q_ph_2: 'Mitochondria', q_ph_3: 'chlorophyll' },
    score: 4,
    maxScore: 6,
    autoGraded: true,
    submittedAt: stamp(1, 18, 30),
  },
]
