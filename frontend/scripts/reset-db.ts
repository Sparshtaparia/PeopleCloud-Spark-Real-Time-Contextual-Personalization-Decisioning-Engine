import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const dbPath = path.join(__dirname, '../prisma/dev.db')

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
  console.log('Deleted existing dev.db')
}

execSync('npx prisma db push', { stdio: 'inherit' })
console.log('Database schema pushed successfully.')
