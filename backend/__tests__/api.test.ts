import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app, prisma } from '../src/index'

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
  const testItemCode = `TEST-PKG-${Date.now()}`

  beforeAll(async () => {
    const supRes = await request(app).post('/auth/login').send({ username: 'supervisor', password: 'super1234' })
    supervisorToken = supRes.body.token

    const adminRes = await request(app).post('/auth/login').send({ username: 'admin', password: 'admin123' })
    adminToken = adminRes.body.token

    const staffRes = await request(app).post('/auth/login').send({ username: 'staff', password: 'staff123' })
    staffToken = staffRes.body.token

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

    it('Admin should be rejected with 403', async () => {
      const res = await request(app)
        .patch(`/products/${testProductId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'inactive' })

      expect(res.status).toBe(403)
    })

    it('Staff should be rejected with 403', async () => {
      const res = await request(app)
        .patch(`/products/${testProductId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'inactive' })

      expect(res.status).toBe(403)
    })

    it('should return 400 for invalid status value', async () => {
      const res = await request(app)
        .patch(`/products/${testProductId}/status`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ status: 'invalid_status' })

      expect(res.status).toBe(400)
    })

    it('should return 404 for non-existent product ID', async () => {
      const res = await request(app)
        .patch('/products/999999/status')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ status: 'inactive' })

      expect(res.status).toBe(404)
    })
  })

  describe('B. Inactive Transaction Guard (POST /transactions)', () => {
    beforeAll(async () => {
      // Set to inactive
      await prisma.product.update({
        where: { id: testProductId },
        data: { status: 'inactive' }
      })
    })

    afterAll(async () => {
      // Restore to active
      await prisma.product.update({
        where: { id: testProductId },
        data: { status: 'active' }
      })
    })

    it('should reject Receive transaction for inactive product with 409', async () => {
      const res = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          itemCode: testItemCode,
          type: 'receive',
          quantity: 5,
        })

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('ปิดการใช้งาน')
    })

    it('should reject Issue transaction for inactive product with 409', async () => {
      const res = await request(app)
        .post('/transactions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          itemCode: testItemCode,
          type: 'issue',
          quantity: 2,
        })

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('ปิดการใช้งาน')
    })
  })

  describe('C. Quantity Guard (PATCH /products/:id/quantity)', () => {
    beforeAll(async () => {
      await prisma.product.update({
        where: { id: testProductId },
        data: { status: 'inactive' }
      })
    })

    afterAll(async () => {
      await prisma.product.update({
        where: { id: testProductId },
        data: { status: 'active' }
      })
    })

    it('should reject quantity adjustment for inactive product with 409', async () => {
      const res = await request(app)
        .patch(`/products/${testProductId}/quantity`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({ quantity: 10 })

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('ปิดการใช้งาน')
    })
  })

  describe('D. Hard Delete Guards (DELETE /products/:id)', () => {
    it('GUARD 1: should reject deletion if quantity > 0 with 400', async () => {
      await prisma.product.update({ where: { id: testProductId }, data: { quantity: 15 } })

      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('สต็อกคงเหลือ')

      // Reset back to 0
      await prisma.product.update({ where: { id: testProductId }, data: { quantity: 0 } })
    })

    it('GUARD 2: should reject deletion if product has transactions with 409', async () => {
      const tx = await prisma.transaction.create({
        data: {
          productId: testProductId,
          type: 'receive',
          quantity: 5,
          status: 'confirmed',
          itemSnapshot: { itemCode: testItemCode },
          createdById: 10,
        }
      })

      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('ประวัติการทำรายการ')

      // Cleanup test transaction
      await prisma.transaction.delete({ where: { id: tx.id } })
    })

    it('GUARD 3: should reject deletion if product has ProductLot with 409', async () => {
      const lot = await prisma.productLot.create({
        data: {
          productId: testProductId,
          lotNumber: `TEST-LOT-${Date.now()}`,
          receivedDate: new Date(),
          receivedQuantity: 10,
          remainingQuantity: 10,
          status: 'active',
        }
      })

      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('ประวัติ Lot')

      // Cleanup test lot
      await prisma.productLot.delete({ where: { id: lot.id } })
    })

    it('GUARD 4: should reject deletion if product is BOM Parent with 409', async () => {
      const bom = await prisma.billOfMaterial.create({
        data: {
          parentItemCode: testItemCode,
          componentItemCode: 'SOME-COMP',
          description: 'Test BOM Parent',
          uom: 'PCS',
          quantity: 1,
          warehouse: 'WPK',
          depth: 1,
          bomType: 'Packaging',
        }
      })

      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('สูตรโครงสร้าง BOM')

      // Cleanup test BOM
      await prisma.billOfMaterial.delete({ where: { id: bom.id } })
    })

    it('GUARD 4: should reject deletion if product is BOM Component with 409', async () => {
      const bom = await prisma.billOfMaterial.create({
        data: {
          parentItemCode: 'SOME-PARENT',
          componentItemCode: testItemCode,
          description: 'Test BOM Component',
          uom: 'PCS',
          quantity: 1,
          warehouse: 'WPK',
          depth: 1,
          bomType: 'Packaging',
        }
      })

      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${supervisorToken}`)

      expect(res.status).toBe(409)
      expect(res.body.error).toContain('สูตรโครงสร้าง BOM')

      // Cleanup test BOM
      await prisma.billOfMaterial.delete({ where: { id: bom.id } })
    })

    it('Role: Admin should be rejected from deleting product with 403', async () => {
      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(403)
    })

    it('Role: Staff should be rejected from deleting product with 403', async () => {
      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${staffToken}`)

      expect(res.status).toBe(403)
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
