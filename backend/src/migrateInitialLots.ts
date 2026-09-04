import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// FIFO Go-Live Date: 31 August 2026 00:00:00 UTC
const FIFO_GO_LIVE_DATE = new Date('2026-08-31T00:00:00.000Z')

async function migratePackagingInitialLots() {
  console.log('=================================================================')
  console.log('🚀 STEP 3.9: Initial Lot Migration (Focus: PACKAGING ONLY)')
  console.log('=================================================================')
  console.log(`📅 FIFO Go-Live Date: ${FIFO_GO_LIVE_DATE.toISOString()}`)

  // 1. Fetch only Packaging products
  const packagingProducts = await prisma.product.findMany({
    where: { itemType: 'Packaging' },
    orderBy: { itemCode: 'asc' }
  })

  console.log(`📦 Total Packaging Products found: ${packagingProducts.length} รายการ`)

  // 2. Clear lots from non-packaging products to focus strictly on Packaging
  const nonPackagingProducts = await prisma.product.findMany({
    where: { itemType: { not: 'Packaging' } },
    select: { id: true }
  })
  const nonPackagingIds = nonPackagingProducts.map(p => p.id)

  const deletedNonPackaging = await prisma.productLot.deleteMany({
    where: {
      productId: { in: nonPackagingIds }
    }
  })
  if (deletedNonPackaging.count > 0) {
    console.log(`🧹 Cleaned up ${deletedNonPackaging.count} non-packaging lots from ProductLot table.`)
  }

  // 3. Prepare Initial Lots for Packaging products
  let positiveCount = 0
  let zeroCount = 0

  const lotsToCreate: Array<{
    productId: number
    lotNumber: string
    supplierLot: string
    receivedDate: Date
    receivedQuantity: number
    remainingQuantity: number
    transactionId: null
    status: string
  }> = []

  for (const product of packagingProducts) {
    if (product.quantity <= 0) {
      zeroCount++
      continue
    }

    positiveCount++
    lotsToCreate.push({
      productId: product.id,
      lotNumber: `INIT-${product.itemCode}`,
      supplierLot: 'INITIAL_STOCK',
      receivedDate: FIFO_GO_LIVE_DATE,
      receivedQuantity: product.quantity,
      remainingQuantity: product.quantity,
      transactionId: null,
      status: 'active'
    })
  }

  // 4. Check existing lots among packaging products
  const existingLots = await prisma.productLot.findMany({
    where: {
      lotNumber: { in: lotsToCreate.map(l => l.lotNumber) }
    },
    select: { lotNumber: true }
  })
  const existingLotNumbers = new Set(existingLots.map(l => l.lotNumber))
  const newLotsToInsert = lotsToCreate.filter(l => !existingLotNumbers.has(l.lotNumber))

  // 5. Insert new lots if any
  let createdCount = 0
  if (newLotsToInsert.length > 0) {
    const res = await prisma.productLot.createMany({
      data: newLotsToInsert,
      skipDuplicates: true
    })
    createdCount = res.count
  }

  // 6. Total active Packaging Lots in DB
  const totalPackagingLots = await prisma.productLot.count({
    where: {
      product: { itemType: 'Packaging' }
    }
  })

  console.log('\n=================================================================')
  console.log('📊 MIGRATION SUMMARY REPORT (PACKAGING ONLY)')
  console.log('=================================================================')
  console.log(`Packaging Products ทั้งหมด:              ${packagingProducts.length} รายการ`)
  console.log(`Packaging Products ที่มี quantity > 0:    ${positiveCount} รายการ`)
  console.log(`Packaging Products ที่มี quantity = 0:    ${zeroCount} รายการ`)
  console.log(`Initial Lots ที่สร้างใหม่:                ${createdCount} รายการ`)
  console.log(`Initial Lots ที่มีอยู่เดิม:               ${existingLots.length} รายการ`)
  console.log(`รวม Initial Lots (Packaging) ในระบบ:      ${totalPackagingLots} รายการ`)
  console.log('=================================================================\n')
}

migratePackagingInitialLots()
  .catch((e) => {
    console.error('❌ Migration Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
