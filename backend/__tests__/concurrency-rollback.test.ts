import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { app, prisma } from '../src/index'
import type { Prisma } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret'

function makeToken(user: { id: number; username: string; role: string }) {
  return jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '1h',
  })
}

describe('Test Hardening: FIFO Concurrency & Transaction Rollback', () => {
  let supervisorToken: string
  let staffToken: string
  let testStaffUser: { id: number; username: string; role: string }
  let testSupervisorUser: { id: number; username: string; role: string }

  const timestamp = Date.now()
  const pkgItemCode = `TEST-PKG-CONCURR-${timestamp}`
  const rollbackItemCode = `TEST-PKG-ROLLBACK-${timestamp}`
  const insuffItemCode = `TEST-PKG-INSUFF-${timestamp}`

  let pkgProductId: number
  let rollbackProductId: number
  let insuffProductId: number

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123', 10)

    testStaffUser = await prisma.user.create({
      data: {
        username: `test-staff-cr-${timestamp}`,
        password: passwordHash,
        fullName: 'Test Staff Concurrency',
        role: 'warehouse_staff',
        status: 'approved',
      },
    })
    staffToken = makeToken(testStaffUser)

    testSupervisorUser = await prisma.user.create({
      data: {
        username: `test-sup-cr-${timestamp}`,
        password: passwordHash,
        fullName: 'Test Supervisor Concurrency',
        role: 'supervisor',
        status: 'approved',
      },
    })
    supervisorToken = makeToken(testSupervisorUser)

    // 1. Setup product for FIFO concurrency test: Initial quantity = 10
    const createdPkg = await prisma.product.create({
      data: {
        itemCode: pkgItemCode,
        description: 'Packaging for Concurrency Test',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'CONCURR-01',
        quantity: 10,
        itemType: 'Packaging',
        status: 'active',
        minStock: 2,
      },
    })
    pkgProductId = createdPkg.id

    // ProductLot with 10 units
    await prisma.productLot.create({
      data: {
        productId: pkgProductId,
        lotNumber: `LOT-CONCURR-${timestamp}`,
        receivedDate: new Date(),
        receivedQuantity: 10,
        remainingQuantity: 10,
        status: 'active',
      },
    })

    // 2. Setup product for Rollback test: Initial quantity = 10
    const createdRollback = await prisma.product.create({
      data: {
        itemCode: rollbackItemCode,
        description: 'Packaging for Rollback Test',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'ROLLBACK-01',
        quantity: 10,
        itemType: 'Packaging',
        status: 'active',
        minStock: 2,
      },
    })
    rollbackProductId = createdRollback.id

    await prisma.productLot.create({
      data: {
        productId: rollbackProductId,
        lotNumber: `LOT-ROLLBACK-${timestamp}`,
        receivedDate: new Date(),
        receivedQuantity: 10,
        remainingQuantity: 10,
        status: 'active',
      },
    })

    // 3. Setup product for Insufficient Stock test (TEST A): Initial quantity = 5
    const createdInsuff = await prisma.product.create({
      data: {
        itemCode: insuffItemCode,
        description: 'Packaging for Insufficient Stock Test',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'INSUFF-01',
        quantity: 5,
        itemType: 'Packaging',
        status: 'active',
        minStock: 2,
      },
    })
    insuffProductId = createdInsuff.id

    await prisma.productLot.create({
      data: {
        productId: insuffProductId,
        lotNumber: `LOT-INSUFF-${timestamp}`,
        receivedDate: new Date(),
        receivedQuantity: 5,
        remainingQuantity: 5,
        status: 'active',
      },
    })
  })

  afterAll(async () => {
    try {
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { link: { contains: pkgItemCode } },
            { link: { contains: rollbackItemCode } },
            { link: { contains: insuffItemCode } },
          ],
        },
      })
      await prisma.transactionLotAllocation.deleteMany({
        where: {
          transaction: {
            OR: [
              { productId: pkgProductId },
              { productId: rollbackProductId },
              { productId: insuffProductId },
            ],
          },
        },
      })
      await prisma.transaction.deleteMany({
        where: {
          OR: [
            { productId: pkgProductId },
            { productId: rollbackProductId },
            { productId: insuffProductId },
            { createdById: { in: [testStaffUser?.id, testSupervisorUser?.id].filter(Boolean) } },
          ],
        },
      })
      await prisma.productLot.deleteMany({
        where: {
          OR: [
            { productId: pkgProductId },
            { productId: rollbackProductId },
            { productId: insuffProductId },
          ],
        },
      })
      await prisma.product.deleteMany({
        where: {
          id: { in: [pkgProductId, rollbackProductId, insuffProductId].filter(Boolean) },
        },
      })
      await prisma.user.deleteMany({
        where: {
          id: { in: [testStaffUser?.id, testSupervisorUser?.id].filter(Boolean) },
        },
      })
    } catch (err) {
      console.error('Cleanup error:', err)
    }
  })

  // =========================================================================
  // BUG-OBS-001 / TEST A: Insufficient Stock Returns HTTP 409
  // =========================================================================
  it('BUG-OBS-001 / TEST A: Insufficient stock on transaction confirmation returns HTTP 409 and preserves stock state', async () => {
    // Insufficient product has initial quantity = 5, Lot remaining = 5
    // Create an Issue transaction requesting 10 (more than available)
    const issueRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: insuffItemCode, type: 'issue', quantity: 10 })
    expect(issueRes.status).toBe(201)
    const txId = issueRes.body.id

    // Attempt to confirm transaction
    const confirmRes = await request(app)
      .post(`/transactions/${txId}/confirm`)
      .set('Authorization', `Bearer ${supervisorToken}`)

    // 1. HTTP status = 409 (Conflict), NOT 500
    expect(confirmRes.status).toBe(409)

    // 2. Existing insufficient-stock error message is preserved
    expect(confirmRes.body.error).toBe('สต็อกใน Lot ไม่เพียงพอสำหรับการเบิก')

    // 3. Product.quantity is unchanged (5)
    const product = await prisma.product.findUnique({ where: { id: insuffProductId } })
    expect(product!.quantity).toBe(5)

    // 4. ProductLot.remainingQuantity is unchanged (5)
    const lots = await prisma.productLot.findMany({ where: { productId: insuffProductId } })
    expect(lots[0].remainingQuantity).toBe(5)
    expect(lots[0].status).toBe('active')

    // 5. Transaction remains pending
    const tx = await prisma.transaction.findUnique({ where: { id: txId } })
    expect(tx!.status).toBe('pending')

    // 6. No TransactionLotAllocation is created
    const allocations = await prisma.transactionLotAllocation.findMany({
      where: { transactionId: txId },
    })
    expect(allocations.length).toBe(0)
  })

  // =========================================================================
  // GAP-001 / TEST C: FIFO Concurrency Test (Strict HTTP 409 for Losing Request)
  // =========================================================================
  it('GAP-001 / TEST C: Concurrent Issue Confirmations - exactly one succeeds (200), one rejected strictly with HTTP 409', async () => {
    // Product quantity = 10, Lot remaining = 10
    // Create Tx A: Issue 7
    const txARes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'issue', quantity: 7 })
    expect(txARes.status).toBe(201)
    const txAId = txARes.body.id

    // Create Tx B: Issue 5
    const txBRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'issue', quantity: 5 })
    expect(txBRes.status).toBe(201)
    const txBId = txBRes.body.id

    // Total requested = 12, Available = 10
    // Send both confirm requests concurrently using Promise.all
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/transactions/${txAId}/confirm`)
        .set('Authorization', `Bearer ${supervisorToken}`),
      request(app)
        .post(`/transactions/${txBId}/confirm`)
        .set('Authorization', `Bearer ${supervisorToken}`),
    ])

    // Verify: Exactly ONE 200 (success) and ONE rejection strictly with HTTP 409
    const statuses = [resA.status, resB.status]
    expect(statuses).toContain(200)

    const successRes = resA.status === 200 ? resA : resB
    const failedRes = resA.status === 200 ? resB : resA

    // BUG-OBS-001 Remediation: losing transaction strictly receives 409 (Conflict), NOT 500!
    expect(failedRes.status).toBe(409)
    expect(failedRes.body.error).toBe('สต็อกใน Lot ไม่เพียงพอสำหรับการเบิก')

    // Invariant Checks on Database:
    const updatedProduct = await prisma.product.findUnique({ where: { id: pkgProductId } })
    expect(updatedProduct).not.toBeNull()
    expect(updatedProduct!.quantity).toBeGreaterThanOrEqual(0)

    // If Tx A (qty 7) won: remaining should be 3. If Tx B (qty 5) won: remaining should be 5.
    const wonTxId = successRes.body.id
    const lostTxId = failedRes === resA ? txAId : txBId

    if (wonTxId === txAId) {
      expect(updatedProduct!.quantity).toBe(3)
    } else {
      expect(updatedProduct!.quantity).toBe(5)
    }

    // Verify ProductLot records: never negative, sum equals Product.quantity
    const lots = await prisma.productLot.findMany({ where: { productId: pkgProductId } })
    const totalRemainingLots = lots.reduce((sum, l) => sum + l.remainingQuantity, 0)
    expect(totalRemainingLots).toBe(updatedProduct!.quantity)
    expect(lots.every(l => l.remainingQuantity >= 0)).toBe(true)

    // Verify Transaction statuses in DB: won is confirmed, lost is still pending (never corrupted or marked confirmed)
    const dbWonTx = await prisma.transaction.findUnique({ where: { id: wonTxId } })
    const dbLostTx = await prisma.transaction.findUnique({ where: { id: lostTxId } })
    expect(dbWonTx!.status).toBe('confirmed')
    expect(dbLostTx!.status).toBe('pending')

    // Verify Allocations: exactly one transaction has allocations, total allocated equals won quantity
    const wonAllocations = await prisma.transactionLotAllocation.findMany({ where: { transactionId: wonTxId } })
    const lostAllocations = await prisma.transactionLotAllocation.findMany({ where: { transactionId: lostTxId } })

    const totalAllocated = wonAllocations.reduce((sum, a) => sum + a.quantity, 0)
    expect(totalAllocated).toBe(dbWonTx!.quantity)
    expect(lostAllocations.length).toBe(0)
  })

  // =========================================================================
  // GAP-002 / TEST B: Transaction Rollback & Unexpected Error (Returns HTTP 500)
  // =========================================================================
  it('GAP-002 / TEST B: Transaction Rollback - failure inside $transaction causes full database rollback and returns HTTP 500', async () => {
    // Initial state: Product quantity = 10, Lot remaining = 10, status = 'active'
    const preProduct = await prisma.product.findUnique({ where: { id: rollbackProductId } })
    const preLots = await prisma.productLot.findMany({ where: { productId: rollbackProductId } })
    expect(preProduct!.quantity).toBe(10)
    expect(preLots[0].remainingQuantity).toBe(10)
    expect(preLots[0].status).toBe('active')

    // Create pending Issue transaction: Issue 4
    const issueRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: rollbackItemCode, type: 'issue', quantity: 4 })
    expect(issueRes.status).toBe(201)
    const txId = issueRes.body.id

    // Inject failure: Intercept prisma.$transaction so that tx.transactionLotAllocation.create throws
    // Note: tx.productLot.update will execute first against PostgreSQL inside tx.
    // Then when tx.transactionLotAllocation.create throws, the entire tx must rollback!
    const originalTransaction = prisma.$transaction.bind(prisma)

    // Intercept $transaction callback
    const mockedTransaction = (async (
      arg1: unknown,
      arg2?: unknown
    ): Promise<unknown> => {
      if (typeof arg1 === 'function') {
        const userCallback = arg1 as (tx: Prisma.TransactionClient) => Promise<unknown>
        return originalTransaction(async (realTx: Prisma.TransactionClient) => {
          // Hook into transactionLotAllocation.create on realTx
          realTx.transactionLotAllocation.create = (async () => {
            // Throw simulated database failure inside transaction AFTER productLot.update has already executed!
            throw new Error('Simulated Mid-Transaction Database Failure on Allocation')
          }) as unknown as typeof realTx.transactionLotAllocation.create

          return userCallback(realTx)
        }, arg2 as { maxWait?: number; timeout?: number })
      }
      return originalTransaction(arg1 as Prisma.PrismaPromise<unknown>[], arg2 as { maxWait?: number; timeout?: number })
    }) as typeof prisma.$transaction

    prisma.$transaction = mockedTransaction

    try {
      const confirmRes = await request(app)
        .post(`/transactions/${txId}/confirm`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      // Confirm endpoint catches the thrown error and returns HTTP 500
      expect(confirmRes.status).toBe(500)
    } finally {
      // Always restore original $transaction
      prisma.$transaction = originalTransaction
    }

    // -----------------------------------------------------------------------
    // POST-FAILURE ROLLBACK ASSERTIONS:
    // Real PostgreSQL must have executed ROLLBACK!
    // -----------------------------------------------------------------------
    const postProduct = await prisma.product.findUnique({ where: { id: rollbackProductId } })
    const postLots = await prisma.productLot.findMany({ where: { productId: rollbackProductId } })
    const postTx = await prisma.transaction.findUnique({ where: { id: txId } })
    const postAllocations = await prisma.transactionLotAllocation.findMany({ where: { transactionId: txId } })

    // 1. Product quantity remains completely unchanged (10, NOT 6)
    expect(postProduct!.quantity).toBe(10)
    expect(postProduct!.quantity).toBe(preProduct!.quantity)

    // 2. ProductLot remainingQuantity remains completely unchanged (10, NOT 6)
    expect(postLots[0].remainingQuantity).toBe(10)
    expect(postLots[0].remainingQuantity).toBe(preLots[0].remainingQuantity)

    // 3. ProductLot status remains 'active' (NOT depleted or partially modified)
    expect(postLots[0].status).toBe('active')
    expect(postLots[0].status).toBe(preLots[0].status)

    // 4. Transaction status remains 'pending' (NOT confirmed)
    expect(postTx!.status).toBe('pending')

    // 5. Zero partial allocation records created
    expect(postAllocations.length).toBe(0)

    // 6. Zero approval notifications created for this failed transaction
    const notifs = await prisma.notification.findMany({
      where: { transactionId: txId, type: 'approval_result' },
    })
    expect(notifs.length).toBe(0)
  })
})
