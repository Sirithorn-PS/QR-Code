import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { app, prisma } from '../src/index'

const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret'

function makeToken(user: { id: number; username: string; role: string }) {
  return jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '1h',
  })
}

describe('Low Stock Notification & Min Stock Management Tests', () => {
  let supervisorToken: string
  let staffToken: string
  let adminToken: string
  let testStaffUser: { id: number; username: string; role: string }
  let testSupervisorUser: { id: number; username: string; role: string }
  let testAdminUser: { id: number; username: string; role: string }

  const timestamp = Date.now()
  const pkgItemCode = `TEST-PKG-LOW-${timestamp}`
  const fgItemCode = `TEST-FG-LOW-${timestamp}`
  let pkgProductId: number
  let fgProductId: number

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123', 10)

    // 1. Create temporary isolated test users
    testStaffUser = await prisma.user.create({
      data: {
        username: `test-staff-ls-${timestamp}`,
        password: passwordHash,
        fullName: 'Test Staff LowStock',
        role: 'warehouse_staff',
        status: 'approved',
      },
    })
    staffToken = makeToken(testStaffUser)

    testSupervisorUser = await prisma.user.create({
      data: {
        username: `test-sup-ls-${timestamp}`,
        password: passwordHash,
        fullName: 'Test Supervisor LowStock',
        role: 'supervisor',
        status: 'approved',
      },
    })
    supervisorToken = makeToken(testSupervisorUser)

    testAdminUser = await prisma.user.create({
      data: {
        username: `test-admin-ls-${timestamp}`,
        password: passwordHash,
        fullName: 'Test Admin LowStock',
        role: 'admin',
        status: 'approved',
      },
    })
    adminToken = makeToken(testAdminUser)

    // 2. Create a test Packaging product
    const createdPkg = await prisma.product.create({
      data: {
        itemCode: pkgItemCode,
        description: 'Test Packaging for Low Stock',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'PKG-01',
        quantity: 20,
        itemType: 'Packaging',
        status: 'active',
        minStock: 10,
      },
    })
    pkgProductId = createdPkg.id

    // Create an initial active lot for the Packaging product so FIFO can allocate
    await prisma.productLot.create({
      data: {
        productId: pkgProductId,
        lotNumber: `LOT-${Date.now()}`,
        receivedDate: new Date(),
        receivedQuantity: 20,
        remainingQuantity: 20,
        status: 'active',
      },
    })

    // 3. Create a test FG (Non-Packaging) product
    const createdFg = await prisma.product.create({
      data: {
        itemCode: fgItemCode,
        description: 'Test FG for Low Stock Guard',
        unit: 'BOTTLE',
        warehouse: 'WPK',
        location: 'FG-01',
        quantity: 20,
        itemType: 'FG',
        status: 'active',
        minStock: 10,
      },
    })
    fgProductId = createdFg.id
  })

  afterAll(async () => {
    // Cleanup test artifacts
    try {
      await prisma.notification.deleteMany({
        where: {
          OR: [
            { link: { contains: pkgItemCode } },
            { link: { contains: fgItemCode } },
          ],
        },
      })
      await prisma.transactionLotAllocation.deleteMany({
        where: {
          transaction: {
            OR: [
              { productId: pkgProductId },
              { productId: fgProductId },
            ],
          },
        },
      })
      await prisma.transaction.deleteMany({
        where: {
          OR: [
            { productId: pkgProductId },
            { productId: fgProductId },
            { createdById: { in: [testStaffUser?.id, testSupervisorUser?.id, testAdminUser?.id].filter(Boolean) } },
          ],
        },
      })
      await prisma.productLot.deleteMany({
        where: {
          OR: [
            { productId: pkgProductId },
            { productId: fgProductId },
          ],
        },
      })
      await prisma.product.deleteMany({
        where: {
          id: { in: [pkgProductId, fgProductId] },
        },
      })
      await prisma.user.deleteMany({
        where: {
          id: { in: [testStaffUser?.id, testSupervisorUser?.id, testAdminUser?.id].filter(Boolean) },
        },
      })
    } catch (err) {
      console.error('Cleanup error:', err)
    }
  })

  // -------------------------------------------------------------
  // Test 1: quantity > minStock (No Notification)
  // -------------------------------------------------------------
  it('1. quantity > minStock: should not trigger notification when quantity remains above minStock', async () => {
    // Current stock = 20, minStock = 10. Issue 3 -> nextQty = 17 (> 10)
    const issueRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'issue', quantity: 3 })
    expect(issueRes.status).toBe(201)
    const txId = issueRes.body.id

    // Confirm issue
    const confirmRes = await request(app)
      .post(`/transactions/${txId}/confirm`)
      .set('Authorization', `Bearer ${supervisorToken}`)
    expect(confirmRes.status).toBe(200)

    // Verify no low_stock notification created
    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(0)
  })

  // -------------------------------------------------------------
  // Test 2: quantity = minStock (Triggers Notification)
  // -------------------------------------------------------------
  it('2. quantity = minStock: should trigger notification when quantity drops exactly to minStock', async () => {
    // Current stock = 17, minStock = 10. Issue 7 -> nextQty = 10 (= minStock)
    const issueRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'issue', quantity: 7 })
    expect(issueRes.status).toBe(201)
    const txId = issueRes.body.id

    const confirmRes = await request(app)
      .post(`/transactions/${txId}/confirm`)
      .set('Authorization', `Bearer ${supervisorToken}`)
    expect(confirmRes.status).toBe(200)

    // Check low_stock notification created
    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(1)
    expect(notifs[0].targetRole).toBe('supervisor')
    expect(notifs[0].userId).toBeNull()
    expect(notifs[0].title).toContain(`⚠️ วัตถุดิบบรรจุภัณฑ์ใกล้หมด: ${pkgItemCode}`)
    expect(notifs[0].message).toContain('คงเหลือ: 10 PCS')
  })

  // -------------------------------------------------------------
  // Test 13: Duplicate Prevention (10 -> 9 does not create another)
  // -------------------------------------------------------------
  it('13. Duplicate Prevention: should not create duplicate notification when stock decreases further while already low', async () => {
    // Current stock = 10 (already <= minStock 10). Issue 1 -> nextQty = 9
    const issueRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'issue', quantity: 1 })
    expect(issueRes.status).toBe(201)
    const txId = issueRes.body.id

    const confirmRes = await request(app)
      .post(`/transactions/${txId}/confirm`)
      .set('Authorization', `Bearer ${supervisorToken}`)
    expect(confirmRes.status).toBe(200)

    // Total low_stock notifications should STILL be 1 (no duplicate!)
    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(1)
  })

  // -------------------------------------------------------------
  // Test 3: quantity < minStock (Direct transition from > to <)
  // -------------------------------------------------------------
  it('3. quantity < minStock: should trigger notification when stock drops directly below minStock from above', async () => {
    // Clear existing notifications for fresh test
    await prisma.notification.deleteMany({ where: { link: { contains: pkgItemCode } } })

    // Reset stock to 15 (> 10)
    await prisma.product.update({ where: { id: pkgProductId }, data: { quantity: 15 } })
    await prisma.productLot.updateMany({ where: { productId: pkgProductId }, data: { remainingQuantity: 15, status: 'active' } })

    // Issue 7 -> drops from 15 to 8 (< 10)
    const issueRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'issue', quantity: 7 })
    expect(issueRes.status).toBe(201)
    const txId = issueRes.body.id

    const confirmRes = await request(app)
      .post(`/transactions/${txId}/confirm`)
      .set('Authorization', `Bearer ${supervisorToken}`)
    expect(confirmRes.status).toBe(200)

    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(1)
    expect(notifs[0].message).toContain('คงเหลือ: 8 PCS')
  })

  // -------------------------------------------------------------
  // Test 4: minStock = null (No notification)
  // -------------------------------------------------------------
  it('4. minStock = null: should not trigger notification when minStock is null', async () => {
    await prisma.notification.deleteMany({ where: { link: { contains: pkgItemCode } } })

    // Set minStock to null
    await prisma.product.update({ where: { id: pkgProductId }, data: { minStock: null, quantity: 15 } })
    await prisma.productLot.updateMany({ where: { productId: pkgProductId }, data: { remainingQuantity: 15, status: 'active' } })

    const issueRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'issue', quantity: 10 })
    expect(issueRes.status).toBe(201)
    const txId = issueRes.body.id

    await request(app)
      .post(`/transactions/${txId}/confirm`)
      .set('Authorization', `Bearer ${supervisorToken}`)

    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(0)
  })

  // -------------------------------------------------------------
  // Test 5: minStock = 0 (Triggers notification when quantity = 0)
  // -------------------------------------------------------------
  it('5. minStock = 0: should trigger notification when stock drops to 0 with minStock = 0', async () => {
    await prisma.notification.deleteMany({ where: { link: { contains: pkgItemCode } } })

    // Set minStock = 0, quantity = 5
    await prisma.product.update({ where: { id: pkgProductId }, data: { minStock: 0, quantity: 5 } })
    await prisma.productLot.updateMany({ where: { productId: pkgProductId }, data: { remainingQuantity: 5, status: 'active' } })

    const issueRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'issue', quantity: 5 })
    expect(issueRes.status).toBe(201)
    const txId = issueRes.body.id

    await request(app)
      .post(`/transactions/${txId}/confirm`)
      .set('Authorization', `Bearer ${supervisorToken}`)

    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(1)
    expect(notifs[0].message).toContain('คงเหลือ: 0 PCS')
  })

  // -------------------------------------------------------------
  // Test 6: Inactive Product (No notification)
  // -------------------------------------------------------------
  it('6. Inactive Product: should reject issue or quantity update for inactive product with 409', async () => {
    await prisma.product.update({ where: { id: pkgProductId }, data: { status: 'inactive', minStock: 10 } })

    const issueRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'issue', quantity: 1 })
    expect(issueRes.status).toBe(409)

    // Reset status back to active for subsequent tests
    await prisma.product.update({ where: { id: pkgProductId }, data: { status: 'active' } })
  })

  // -------------------------------------------------------------
  // Test 7: Active -> Inactive (No notification)
  // -------------------------------------------------------------
  it('7. Active -> Inactive: changing status to inactive should not create low stock notification', async () => {
    await prisma.notification.deleteMany({ where: { link: { contains: pkgItemCode } } })

    const res = await request(app)
      .patch(`/products/${pkgProductId}/status`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ status: 'inactive' })
    expect(res.status).toBe(200)

    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(0)
  })

  // -------------------------------------------------------------
  // Test 8: Inactive -> Active (No notification immediately)
  // -------------------------------------------------------------
  it('8. Inactive -> Active: activating product should not immediately create low stock notification', async () => {
    await prisma.notification.deleteMany({ where: { link: { contains: pkgItemCode } } })

    const res = await request(app)
      .patch(`/products/${pkgProductId}/status`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ status: 'active' })
    expect(res.status).toBe(200)

    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(0)
  })

  // -------------------------------------------------------------
  // Test 9: Issue Confirm (Covered in tests 2 and 3, verifies status confirmed)
  // -------------------------------------------------------------
  it('9. Issue Confirm: transaction confirmation should successfully update stock and status', async () => {
    await prisma.product.update({ where: { id: pkgProductId }, data: { quantity: 20, minStock: 10 } })
    await prisma.productLot.updateMany({ where: { productId: pkgProductId }, data: { remainingQuantity: 20, status: 'active' } })

    const issueRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'issue', quantity: 2 })
    const txId = issueRes.body.id

    const confirmRes = await request(app)
      .post(`/transactions/${txId}/confirm`)
      .set('Authorization', `Bearer ${supervisorToken}`)
    expect(confirmRes.status).toBe(200)
    expect(confirmRes.body.status).toBe('confirmed')
  })

  // -------------------------------------------------------------
  // Test 10: Issue Reject (No notification)
  // -------------------------------------------------------------
  it('10. Issue Reject: rejected issue should not change stock and not trigger low stock notification', async () => {
    await prisma.notification.deleteMany({ where: { link: { contains: pkgItemCode } } })

    const issueRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'issue', quantity: 10 })
    const txId = issueRes.body.id

    const rejectRes = await request(app)
      .post(`/transactions/${txId}/reject`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ note: 'Reject for test' })
    expect(rejectRes.status).toBe(200)
    expect(rejectRes.body.status).toBe('rejected')

    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(0)
  })

  // -------------------------------------------------------------
  // Test 11: Receive Confirm (No low stock notification, recovers stock)
  // -------------------------------------------------------------
  it('11. Receive Confirm: receive should increase stock and not trigger low stock notification', async () => {
    await prisma.notification.deleteMany({ where: { link: { contains: pkgItemCode } } })

    const receiveRes = await request(app)
      .post('/transactions')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ itemCode: pkgItemCode, type: 'receive', quantity: 15 })
    expect(receiveRes.status).toBe(201)
    const txId = receiveRes.body.id

    const confirmRes = await request(app)
      .post(`/transactions/${txId}/confirm`)
      .set('Authorization', `Bearer ${supervisorToken}`)
    expect(confirmRes.status).toBe(200)

    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(0)
  })

  // -------------------------------------------------------------
  // Test 12: Direct Quantity Adjustment (Triggers when dropping below minStock)
  // -------------------------------------------------------------
  it('12. Direct Quantity Adjustment: supervisor manual adjustment should trigger notification when entering low stock', async () => {
    await prisma.notification.deleteMany({ where: { link: { contains: pkgItemCode } } })

    // Set stock = 20, minStock = 10
    await prisma.product.update({ where: { id: pkgProductId }, data: { quantity: 20, minStock: 10 } })

    // Adjust quantity directly to 8
    const adjRes = await request(app)
      .patch(`/products/${pkgProductId}/quantity`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ quantity: 8 })
    expect(adjRes.status).toBe(200)
    expect(adjRes.body.quantity).toBe(8)

    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(1)
    expect(notifs[0].message).toContain('คงเหลือ: 8 PCS')
  })

  // -------------------------------------------------------------
  // Test 14: Recovery + Re-trigger
  // -------------------------------------------------------------
  it('14. Recovery + Re-trigger: stock returning to normal and then dropping again should trigger a new notification', async () => {
    // Currently stock is 8, notif count = 1.
    // 1. Recover stock to 25 (> 10)
    await request(app)
      .patch(`/products/${pkgProductId}/quantity`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ quantity: 25 })

    // 2. Adjust back down to 10 (<= 10)
    await request(app)
      .patch(`/products/${pkgProductId}/quantity`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ quantity: 10 })

    // Should now have 2 notifications in total (1 previous + 1 newly triggered)
    const notifs = await prisma.notification.findMany({
      where: { link: { contains: pkgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(2)
  })

  // -------------------------------------------------------------
  // Test 15: Packaging Item (Verified in tests above)
  // -------------------------------------------------------------
  it('15. Packaging Item: product with itemType Packaging triggers notification properly', async () => {
    const product = await prisma.product.findUnique({ where: { id: pkgProductId } })
    expect(product?.itemType).toBe('Packaging')
  })

  // -------------------------------------------------------------
  // Test 16: Non-Packaging Guard
  // -------------------------------------------------------------
  it('16. Non-Packaging: FG product should never trigger low stock notification', async () => {
    await prisma.notification.deleteMany({ where: { link: { contains: fgItemCode } } })

    // Stock = 20, minStock = 10. Adjust FG directly to 5 (< 10)
    const adjRes = await request(app)
      .patch(`/products/${fgProductId}/quantity`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ quantity: 5 })
    expect(adjRes.status).toBe(200)

    const notifs = await prisma.notification.findMany({
      where: { link: { contains: fgItemCode }, type: 'low_stock' },
    })
    expect(notifs.length).toBe(0)
  })

  // -------------------------------------------------------------
  // Test 17: Admin Access (Cannot see low_stock, Cannot set minStock)
  // -------------------------------------------------------------
  it('17. Admin: should reject minStock update with 403 and not see low_stock in notifications', async () => {
    // 1. Admin tries to update minStock -> 403
    const patchRes = await request(app)
      .patch(`/products/${pkgProductId}/min-stock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minStock: 15 })
    expect(patchRes.status).toBe(403)

    // 2. Admin fetches notifications -> no low_stock items
    const notifRes = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(notifRes.status).toBe(200)
    const lowStockNotifs = (notifRes.body.notifications as { type: string }[]).filter((n) => n.type === 'low_stock')
    expect(lowStockNotifs.length).toBe(0)
  })

  // -------------------------------------------------------------
  // Test 18: Staff Access (Cannot see low_stock, Cannot set minStock)
  // -------------------------------------------------------------
  it('18. Staff: should reject minStock update with 403 and not see low_stock in notifications', async () => {
    // 1. Staff tries to update minStock -> 403
    const patchRes = await request(app)
      .patch(`/products/${pkgProductId}/min-stock`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ minStock: 15 })
    expect(patchRes.status).toBe(403)

    // 2. Staff fetches notifications -> no low_stock items
    const notifRes = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${staffToken}`)
    expect(notifRes.status).toBe(200)
    const lowStockNotifs = (notifRes.body.notifications as { type: string }[]).filter((n) => n.type === 'low_stock')
    expect(lowStockNotifs.length).toBe(0)
  })

  // -------------------------------------------------------------
  // Test 19: Supervisor Access (Can update minStock & Sees low_stock)
  // -------------------------------------------------------------
  it('19. Supervisor: can update minStock and sees low_stock in /notifications', async () => {
    // 1. Supervisor updates minStock to 12
    const patchRes = await request(app)
      .patch(`/products/${pkgProductId}/min-stock`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ minStock: 12 })
    expect(patchRes.status).toBe(200)
    expect(patchRes.body.minStock).toBe(12)

    // 2. Supervisor validates minStock = null is allowed
    const nullRes = await request(app)
      .patch(`/products/${pkgProductId}/min-stock`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ minStock: null })
    expect(nullRes.status).toBe(200)
    expect(nullRes.body.minStock).toBeNull()

    // 3. Supervisor validates negative or decimal minStock is rejected with 400
    const negRes = await request(app)
      .patch(`/products/${pkgProductId}/min-stock`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ minStock: -5 })
    expect(negRes.status).toBe(400)

    const decRes = await request(app)
      .patch(`/products/${pkgProductId}/min-stock`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ minStock: 5.5 })
    expect(decRes.status).toBe(400)

    // 4. Non-Packaging product rejected with 400
    const nonPkgRes = await request(app)
      .patch(`/products/${fgProductId}/min-stock`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ minStock: 10 })
    expect(nonPkgRes.status).toBe(400)

    // 5. Supervisor fetches notifications -> can see low_stock
    const notifRes = await request(app)
      .get('/notifications')
      .set('Authorization', `Bearer ${supervisorToken}`)
    expect(notifRes.status).toBe(200)
    const lowStockNotifs = (notifRes.body.notifications as { type: string }[]).filter((n) => n.type === 'low_stock')
    expect(lowStockNotifs.length).toBeGreaterThan(0)
  })

  // -------------------------------------------------------------
  // Test 20: Notification Creation Failure Non-Critical Safety
  // -------------------------------------------------------------
  it('20. Notification Creation Failure: stock update should still succeed even if notification fails', async () => {
    // Mock prisma.notification.create to throw an error temporarily
    const originalCreate = prisma.notification.create
    prisma.notification.create = (async () => {
      throw new Error('Simulated Notification DB failure')
    }) as unknown as typeof prisma.notification.create

    try {
      // Re-enable minStock = 10, stock = 20
      await prisma.product.update({ where: { id: pkgProductId }, data: { minStock: 10, quantity: 20 } })

      // Direct adjustment to 8 should succeed without crashing
      const adjRes = await request(app)
        .patch(`/products/${pkgProductId}/quantity`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ quantity: 8 })

      expect(adjRes.status).toBe(200)
      expect(adjRes.body.quantity).toBe(8)

      // Verify product quantity in DB was indeed committed to 8
      const dbProduct = await prisma.product.findUnique({ where: { id: pkgProductId } })
      expect(dbProduct?.quantity).toBe(8)
    } finally {
      // Restore original create method
      prisma.notification.create = originalCreate
    }
  })
})
