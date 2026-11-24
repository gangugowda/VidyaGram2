import { openDatabase } from '../db/client'
import { migrate } from '../db/migrate'
import { resetDatabase } from '../db/seed'
import { config } from '../config'
import { countRows } from '../db/client'

const db = openDatabase(config.databasePath)
migrate(db)
await resetDatabase(db)
console.log(`Reset ${config.databasePath}`)
console.log(`Users: ${countRows(db, 'users')} · Classes: ${countRows(db, 'classes')} · Quizzes: ${countRows(db, 'quizzes')}`)
db.close()
