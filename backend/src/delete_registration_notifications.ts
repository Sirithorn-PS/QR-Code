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
  console.log('Checking registration approval notifications...')

  const regNotifs = await prisma.notification.findMany({
    where: {
      OR: [
        { type: 'user_pending_approval' },
        { link: '/users' },
        { title: { contains: 'ผู้ใช้งานใหม่' } }
      ]
    }
  })

  console.log(`Found ${regNotifs.length} registration approval notification(s):`)
  console.table(regNotifs)

  if (regNotifs.length > 0) {
    const deleteResult = await prisma.notification.deleteMany({
      where: {
        OR: [
          { type: 'user_pending_approval' },
          { link: '/users' },
          { title: { contains: 'ผู้ใช้งานใหม่' } }
        ]
      }
    })
    console.log(`Successfully deleted ${deleteResult.count} registration notification(s).`)
  } else {
    console.log('No registration notifications found to delete.')
  }
}

main()
  .catch((e: unknown) => {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error'
    console.error('Error deleting registration notifications:', errorMsg)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
