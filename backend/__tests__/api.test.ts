import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app, prisma } from '../src/index'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret'

function makeToken(user: { id: number; username: string; role: string }) {
  return jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '1h',
  })
}

describe('API Integration Tests (Security & Roles)', () => {
  it('should reject unauthenticated access to /transactions', async () => {
    const response = await request(app).get('/transactions')
    expect(response.status).toBe(401)
  })

  it('should reject unauthenticated transaction confirmations', async () => {
    const response = await request(app).post('/transactions/1/confirm')
    expect(response.status).toBe(401)
  })

  it('should return 401 for invalid login credentials', async () => {
    const response = await request(app).post('/auth/login').send({
      username: 'wronguser',
      password: 'wrongpassword'
    })
    expect(response.status).toBe(401)
    expect(response.body).toHaveProperty('error')
  })

  it('should reject unauthenticated access to /products/with-bom', async () => {
    const response = await request(app).post('/products/with-bom').send({
      parentItemCode: 'TEST-001',
      componentItemCode: 'TEST-001',
      description: 'Test Item',
    })
    expect(response.status).toBe(401)
  })
})

describe('Product Lifecycle & Hard Delete Guard Integration Tests', () => {
  let supervisorToken: string
  let adminToken: string
  let staffToken: string
  let testProductId: number
  let lifecycleSupervisor: { id: number; username: string; role: string }
  const testItemCode = `TEST-PKG-${Date.now()}`

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123', 10)
    lifecycleSupervisor = await prisma.user.create({
      data: {
        username: `test-sup-lc-${Date.now()}`,
        password: passwordHash,
        fullName: 'Lifecycle Supervisor',
        role: 'supervisor',
        status: 'approved',
      },
    })
    supervisorToken = makeToken(lifecycleSupervisor)
    adminToken = makeToken({ id: 202, username: 'test-admin-lc', role: 'admin' })
    staffToken = makeToken({ id: 203, username: 'test-staff-lc', role: 'warehouse_staff' })

    // Create a temporary packaging product for testing
    const created = await prisma.product.create({
      data: {
        itemCode: testItemCode,
        description: 'Test Packaging Lifecycle Product',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'T-01',
        quantity: 0,
        itemType: 'Packaging',
        status: 'active',
      }
    })
    testProductId = created.id
  })

  afterAll(async () => {
    // Cleanup any remaining test artifacts if test failed prematurely
    try {
      await prisma.billOfMaterial.deleteMany({
        where: {
          OR: [
            { parentItemCode: testItemCode },
            { componentItemCode: testItemCode }
          ]
        }
      })
      await prisma.productLot.deleteMany({ where: { productId: testProductId } })
      await prisma.transaction.deleteMany({ where: { productId: testProductId } })
      await prisma.product.deleteMany({ where: { id: testProductId } })
      if (lifecycleSupervisor?.id) {
        await prisma.user.deleteMany({ where: { id: lifecycleSupervisor.id } })
      }
    } catch {
      // ignore
    }
  })

  describe('A. Product Status API (PATCH /products/:id/status)', () => {
    it('Supervisor should toggle active -> inactive successfully', async () => {
      const res = await request(app)
        .patch(`/products/${testProductId}/status`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ status: 'inactive' })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('inactive')
    })

    it('Supervisor should toggle inactive -> active successfully', async () => {
      const res = await request(app)
        .patch(`/products/${testProductId}/status`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ status: 'active' })

      expect(res.status).toBe(200)
      expect(res.body.status).toBe('active')
    })

    it('Staff should be rejected with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/products/${testProductId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'inactive' })

      expect(res.status).toBe(403)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('Forbidden')
    })

    it('Admin should be rejected with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/products/${testProductId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' })

      expect(res.status).toBe(403)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('Forbidden')
    })

    it('Invalid status value should be rejected with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/products/${testProductId}/status`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ status: 'archived' })

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('สถานะไม่ถูกต้อง')
    })
  })

  describe('B. Product Hard Delete Guard API (DELETE /products/:id)', () => {
    it('Guard: Non-existent product should return 404 Not Found', async () => {
      const res = await request(app)
        .delete('/products/999999')
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(404)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('ไม่พบสินค้า')
    })

    it('Staff should be rejected with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${staffToken}`)

      expect(res.status).toBe(403)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('Forbidden')
    })

    it('Admin should be rejected with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(403)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('Forbidden')
    })

    it('Guard 1: Product with quantity > 0 should be rejected with 400 Bad Request', async () => {
      // Simulate quantity > 0
      await prisma.product.update({
        where: { id: testProductId },
        data: { quantity: 15 }
      })

      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('ยังมีสต็อกคงเหลือ')

      // Reset quantity back to 0
      await prisma.product.update({
        where: { id: testProductId },
        data: { quantity: 0 }
      })
    })

    it('Guard 2: Product referenced in Transactions should be rejected with 409 Conflict', async () => {
      // Create a dummy transaction linked to testProductId
      const tx = await prisma.transaction.create({
        data: {
          productId: testProductId,
          type: 'receive',
          quantity: 10,
          status: 'pending',
          itemSnapshot: { name: 'Test Snapshot' },
          createdById: lifecycleSupervisor.id,
        }
      })

      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(409)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('มีประวัติการทำรายการแล้ว')

      // Cleanup dummy transaction
      await prisma.transaction.delete({ where: { id: tx.id } })
    })

    it('Guard 3: Product with ProductLot records should be rejected with 409 Conflict', async () => {
      // Create a dummy product lot
      const lot = await prisma.productLot.create({
        data: {
          productId: testProductId,
          lotNumber: `LOT-TEST-${Date.now()}`,
          receivedDate: new Date(),
          receivedQuantity: 10,
          remainingQuantity: 10,
          status: 'active'
        }
      })

      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(409)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('มีประวัติ Lot')

      // Cleanup lot
      await prisma.productLot.delete({ where: { id: lot.id } })
    })

    it('Guard 4: Product referenced in BOM component should be rejected with 409 Conflict', async () => {
      // Create BOM component reference
      const bom = await prisma.billOfMaterial.create({
        data: {
          parentItemCode: 'FG-PARENT-DUMMY',
          componentItemCode: testItemCode,
          description: 'Dummy Component',
          uom: 'PCS',
          quantity: 1,
          warehouse: 'WPK',
          depth: 1,
          bomType: 'Packaging'
        }
      })

      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(409)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('สูตรโครงสร้าง BOM')

      // Cleanup BOM component
      await prisma.billOfMaterial.delete({ where: { id: bom.id } })
    })

    it('Guard 4: Product referenced as BOM parent should be rejected with 409 Conflict', async () => {
      // Create BOM parent reference
      const bom = await prisma.billOfMaterial.create({
        data: {
          parentItemCode: testItemCode,
          componentItemCode: 'COMP-DUMMY-XYZ',
          description: 'Dummy Child',
          uom: 'PCS',
          quantity: 1,
          warehouse: 'WPK',
          depth: 1,
          bomType: 'Packaging'
        }
      })

      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(409)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('สูตรโครงสร้าง BOM')

      // Cleanup BOM parent
      await prisma.billOfMaterial.delete({ where: { id: bom.id } })
    })

    it('Success: should allow deletion when all 4 guards pass', async () => {
      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify product is gone
      const check = await prisma.product.findUnique({ where: { id: testProductId } })
      expect(check).toBeNull()
    })
  })
})

describe('Security & Role Boundary Hardening Tests (STEP 4.14)', () => {
  let authAdmin: { id: number; username: string; role: string }
  let authStaff: { id: number; username: string; role: string }
  let authSupervisor: { id: number; username: string; role: string }
  const authTimestamp = Date.now()

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestAuthPass123', 10)
    authAdmin = await prisma.user.create({
      data: {
        username: `test-auth-adm-${authTimestamp}`,
        password: passwordHash,
        fullName: 'Auth Test Admin',
        role: 'admin',
        status: 'approved',
      },
    })
    authStaff = await prisma.user.create({
      data: {
        username: `test-auth-stf-${authTimestamp}`,
        password: passwordHash,
        fullName: 'Auth Test Staff',
        role: 'warehouse_staff',
        status: 'approved',
      },
    })
    authSupervisor = await prisma.user.create({
      data: {
        username: `test-auth-sup-${authTimestamp}`,
        password: passwordHash,
        fullName: 'Auth Test Supervisor',
        role: 'supervisor',
        status: 'approved',
      },
    })
  })

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        id: { in: [authAdmin?.id, authStaff?.id, authSupervisor?.id].filter(Boolean) },
      },
    })
  })

  describe('1. Authentication Fast-path & Status Guard Tests', () => {
    it('Active Admin Login: should return 200 with real DB ID and role admin', async () => {
      const res = await request(app).post('/auth/login').send({ username: authAdmin.username, password: 'TestAuthPass123' })
      expect(res.status).toBe(200)
      expect(res.body.user.id).toBe(authAdmin.id)
      expect(res.body.user.role).toBe('admin')

      const decoded = jwt.decode(res.body.token) as { userId: number; role: string }
      expect(decoded.userId).toBe(authAdmin.id)
      expect(decoded.role).toBe('admin')
    })

    it('Disabled Admin Login: should reject with 403 when admin status is disabled', async () => {
      try {
        await prisma.user.update({ where: { id: authAdmin.id }, data: { status: 'disabled' } })
        const res = await request(app).post('/auth/login').send({ username: authAdmin.username, password: 'TestAuthPass123' })
        expect(res.status).toBe(403)
        expect(res.body.error).toContain('ระงับการใช้งาน')
      } finally {
        await prisma.user.update({ where: { id: authAdmin.id }, data: { status: 'approved' } })
      }
    })

    it('Active Staff Login: should return 200 with real DB ID and role warehouse_staff', async () => {
      const res = await request(app).post('/auth/login').send({ username: authStaff.username, password: 'TestAuthPass123' })
      expect(res.status).toBe(200)
      expect(res.body.user.id).toBe(authStaff.id)
      expect(res.body.user.role).toBe('warehouse_staff')

      const decoded = jwt.decode(res.body.token) as { userId: number; role: string }
      expect(decoded.userId).toBe(authStaff.id)
      expect(decoded.role).toBe('warehouse_staff')
    })

    it('Disabled Staff Login: should reject with 403 when staff status is disabled', async () => {
      try {
        await prisma.user.update({ where: { id: authStaff.id }, data: { status: 'disabled' } })
        const res = await request(app).post('/auth/login').send({ username: authStaff.username, password: 'TestAuthPass123' })
        expect(res.status).toBe(403)
        expect(res.body.error).toContain('ระงับการใช้งาน')
      } finally {
        await prisma.user.update({ where: { id: authStaff.id }, data: { status: 'approved' } })
      }
    })

    it('Active Supervisor Login: should return 200 with real DB ID and role supervisor', async () => {
      const res = await request(app).post('/auth/login').send({ username: authSupervisor.username, password: 'TestAuthPass123' })
      expect(res.status).toBe(200)
      expect(res.body.user.id).toBe(authSupervisor.id)
      expect(res.body.user.role).toBe('supervisor')

      const decoded = jwt.decode(res.body.token) as { userId: number; role: string }
      expect(decoded.userId).toBe(authSupervisor.id)
      expect(decoded.role).toBe('supervisor')
    })

    it('Disabled Supervisor Login: should reject with 403 when supervisor status is disabled', async () => {
      try {
        await prisma.user.update({ where: { id: authSupervisor.id }, data: { status: 'disabled' } })
        const res = await request(app).post('/auth/login').send({ username: authSupervisor.username, password: 'TestAuthPass123' })
        expect(res.status).toBe(403)
        expect(res.body.error).toContain('ระงับการใช้งาน')
      } finally {
        await prisma.user.update({ where: { id: authSupervisor.id }, data: { status: 'approved' } })
      }
    })
  })

  describe('2. POST /transactions Role Boundary Authorization Tests', () => {
    let adminToken: string
    let staffToken: string
    let supervisorToken: string

    beforeAll(async () => {
      adminToken = makeToken(authAdmin)
      staffToken = makeToken(authStaff)
      supervisorToken = makeToken(authSupervisor)
    })

    it('Admin Token: should reject POST /transactions with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ itemCode: '7520000062', type: 'receive', quantity: 1 })

      expect(res.status).toBe(403)
      expect(res.body.error).toContain('Forbidden')
    })

    it('Staff Token: should pass authorization (not 403)', async () => {
      const res = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ itemCode: 'NON-EXISTENT-XYZ', type: 'receive', quantity: 1 })

      // Passes role guard and reaches product lookup (returns 404), proving authorization succeeded
      expect(res.status).not.toBe(403)
      expect(res.status).toBe(404)
    })

    it('Supervisor Token: should pass authorization (not 403)', async () => {
      const res = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ itemCode: 'NON-EXISTENT-XYZ', type: 'receive', quantity: 1 })

      // Passes role guard and reaches product lookup (returns 404), proving authorization succeeded
      expect(res.status).not.toBe(403)
      expect(res.status).toBe(404)
    })

    it('No Token: should reject unauthenticated POST /transactions with 401', async () => {
      const res = await request(app)
        .post('/transactions')
        .send({ itemCode: '7520000062', type: 'receive', quantity: 1 })

      expect(res.status).toBe(401)
    })
  })

  describe('3. Staff "My Transactions" GET /transactions Authorization & Security Tests', () => {
    let adminToken: string
    let staffToken: string
    let supervisorToken: string
    let fixtureStaffTxId: number

    beforeAll(async () => {
      adminToken = makeToken(authAdmin)
      staffToken = makeToken(authStaff)
      supervisorToken = makeToken(authSupervisor)

      // Create an isolated temporary transaction fixture for Staff ID
      // so Staff data isolation can be reliably verified without relying on permanent DB records
      const createRes = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          itemCode: '60230073A600E',
          type: 'receive',
          quantity: 1,
        })
      fixtureStaffTxId = createRes.body.id
    })

    afterAll(async () => {
      if (fixtureStaffTxId) {
        await prisma.notification.deleteMany({ where: { transactionId: fixtureStaffTxId } })
        await prisma.transaction.deleteMany({ where: { id: fixtureStaffTxId } })
      }
    })

    it('Staff sees only their own transactions in GET /transactions', async () => {
      const res = await request(app)
        .get('/transactions')
        .set('Authorization', `Bearer ${staffToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
      for (const tx of res.body) {
        expect(tx.createdById).toBe(authStaff.id)
      }
      expect(res.body.some((t: { id: number }) => t.id === fixtureStaffTxId)).toBe(true)
    })

    it('Staff cannot bypass createdById filter using query parameters', async () => {
      const res = await request(app)
        .get('/transactions?createdById=999999&userId=999999')
        .set('Authorization', `Bearer ${staffToken}`)

      expect(res.status).toBe(200)
      expect(res.body.length).toBeGreaterThan(0)
      for (const tx of res.body) {
        expect(tx.createdById).toBe(authStaff.id)
        expect(tx.createdById).not.toBe(999999)
      }
    })

    it('Staff can use status filter within their own transactions', async () => {
      const res = await request(app)
        .get('/transactions?status=pending')
        .set('Authorization', `Bearer ${staffToken}`)

      expect(res.status).toBe(200)
      for (const tx of res.body) {
        expect(tx.createdById).toBe(authStaff.id)
        expect(tx.status).toBe('pending')
      }
    })

    it('Staff can use search filter within their own transactions', async () => {
      const res = await request(app)
        .get('/transactions?search=NON_EXISTENT_CODE_XYZ')
        .set('Authorization', `Bearer ${staffToken}`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('Supervisor sees all transactions across all creators', async () => {
      const res = await request(app)
        .get('/transactions')
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body.some((t: { id: number }) => t.id === fixtureStaffTxId)).toBe(true)
    })

    it('Admin maintains existing behavior without createdById restriction', async () => {
      const res = await request(app)
        .get('/transactions')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body.some((t: { id: number }) => t.id === fixtureStaffTxId)).toBe(true)
    })

    it('POST /transactions records createdById strictly from JWT token', async () => {
      // Staff sends a transaction attempt with spoofed createdById: 999
      const res = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          itemCode: '60230073A600E',
          type: 'receive',
          quantity: 1,
          createdById: 999,
        })

      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      const createdId = res.body.id

      try {
        const txRecord = await prisma.transaction.findUnique({
          where: { id: createdId },
        })
        expect(txRecord).toBeDefined()
        expect(txRecord?.createdById).toBe(authStaff.id)
      } finally {
        await prisma.notification.deleteMany({ where: { transactionId: createdId } })
        await prisma.transaction.deleteMany({ where: { id: createdId } })
      }
    })

    it('Staff cannot confirm or reject transactions (403 Forbidden)', async () => {
      const confirmRes = await request(app)
        .post('/transactions/1/confirm')
        .set('Authorization', `Bearer ${staffToken}`)
      expect(confirmRes.status).toBe(403)

      const rejectRes = await request(app)
        .post('/transactions/1/reject')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ note: 'Unauthorized' })
      expect(rejectRes.status).toBe(403)
    })
  })

  describe('3. Security Hardening & Strict CORS Tests (STEP 4.32)', () => {
    it('Wrong Password fails with 401 and does not issue token', async () => {
      const res = await request(app).post('/auth/login').send({ username: 'admin', password: 'wrongpassword' })
      expect(res.status).toBe(401)
      expect(res.body.token).toBeUndefined()
      expect(res.body.error).toBe('รหัสผ่านไม่ถูกต้อง')
    })

    it('Non-existent username fails with 401 and does not issue token', async () => {
      const res = await request(app).post('/auth/login').send({ username: 'non_existent_user_999', password: 'anyPassword' })
      expect(res.status).toBe(401)
      expect(res.body.token).toBeUndefined()
    })

    it('Database error during login fails with 500 without mock user fallback or JWT issuance', async () => {
      const originalFindFirst = prisma.user.findFirst
      prisma.user.findFirst = (async () => {
        throw new Error('Simulated DB connection failure')
      }) as unknown as typeof prisma.user.findFirst

      try {
        const res = await request(app).post('/auth/login').send({ username: 'admin', password: 'admin123' })
        expect(res.status).toBe(500)
        expect(res.body.token).toBeUndefined()
        expect(res.body.user).toBeUndefined()
        expect(res.body.error).toContain('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล')
      } finally {
        prisma.user.findFirst = originalFindFirst
      }
    })

    it('CORS: Exact allowed origin receives Access-Control-Allow-Origin header and credentials', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000')
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('CORS: Unauthorized origin does not receive Access-Control-Allow-Origin header', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://evil-attacker.com')
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('CORS: Fake vercel.app origin does not receive Access-Control-Allow-Origin header', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://malicious-vercel.app')
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('CORS: Fake localhost origin does not receive Access-Control-Allow-Origin header', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost.attacker.com')
      expect(res.headers['access-control-allow-origin']).toBeUndefined()
    })
  })
})
