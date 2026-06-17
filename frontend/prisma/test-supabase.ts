import { PrismaClient } from '@prisma/client'

async function main() {
  const p = new PrismaClient()
  try {
    // Clean up any test data
    await p.$executeRawUnsafe("DELETE FROM \"User\" WHERE id LIKE 'test-%'")

    // Insert with quoted column names
    const sql = "INSERT INTO \"User\" (\"id\", \"email\", \"name\", \"canCreateOrganization\", \"createdAt\", \"updatedAt\") VALUES ('test-1', 't@t.com', 'T', true, NOW(), NOW()) ON CONFLICT (\"id\") DO NOTHING"
    console.log('SQL:', sql)
    const r = await p.$executeRawUnsafe(sql)
    console.log('Insert result:', r)

    // Clean up
    await p.$executeRawUnsafe("DELETE FROM \"User\" WHERE id LIKE 'test-%'")
    console.log('Done')
  } catch (e: any) {
    console.error('Error:', e.message)
  }
  await p.$disconnect()
}

main()
