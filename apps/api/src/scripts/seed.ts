import { openDatabase } from '../db/client'
import { migrate } from '../db/migrate'
import { isDatabaseEmpty, seedDatabase } from '../db/seed'
import { config } from '../config'
import { countRows } from '../db/client'

const db = openDatabase(config.databasePath)
migrate(db)

if (isDatabaseEmpty(db)) {
  await seedDatabase(db)
  console.log(`Seeded ${config.databasePath}`)
} else {
  console.log(`Database already contains ${countRows(db, 'users')} users; nothing to do.`)
}

console.log(`Users: ${countRows(db, 'users')} · Classes: ${countRows(db, 'classes')} · Quizzes: ${countRows(db, 'quizzes')}`)
db.close()
