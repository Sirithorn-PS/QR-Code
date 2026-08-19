import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, '').trim()
}
if (process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DIRECT_URL.replace(/^["']|["']$/g, '').trim()
}

const prisma = new PrismaClient()

async function main() {
  console.log('Updating status for existing users to "approved"...')
  const result = await prisma.user.updateMany({
    where: {
      status: 'pending'
    },
    data: {
      status: 'approved'
    }
  })

  console.log(`Successfully approved ${result.count} existing user(s).`)

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      status: true
    }
  })

  console.log('Current User List in Database:')
  console.table(users)
}

main()
  .catch((e: unknown) => {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Error approving existing users:', errorMsg)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
