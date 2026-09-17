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

describe('BUG-001: Admin User Management Error Handling & False Success Elimination Tests', () => {
  let adminUser: { id: number; username: string; role: string }
  let staffUser: { id: number; username: string; role: string }
  let targetUser: { id: number; username: string; role: string }
  let userWithTx: { id: number; username: string; role: string }
  let adminToken: string
  let staffToken: string

  const timestamp = Date.now()

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123', 10)

    // 1. Create temporary Admin user for testing
    adminUser = await prisma.user.create({
      data: {
        username: `test-admin-${timestamp}`,
        password: passwordHash,
        fullName: 'Test Admin User',
        role: 'admin',
        status: 'approved',
      },
    })
    adminToken = makeToken(adminUser)

    // 2. Create temporary Staff user for testing RBAC
    staffUser = await prisma.user.create({
      data: {
        username: `test-staff-${timestamp}`,
        password: passwordHash,
        fullName: 'Test Staff User',
        role: 'warehouse_staff',
        status: 'approved',
      },
    })
    staffToken = makeToken(staffUser)

    // 3. Create target user to be updated/deleted
    targetUser = await prisma.user.create({
      data: {
        username: `test-target-${timestamp}`,
        password: passwordHash,
        fullName: 'Target User',
        employeeId: 'EMP-TGT-01',
        role: 'warehouse_staff',
        status: 'approved',
      },
    })

    // 4. Create user linked to a transaction to test FK deletion guard (409)
    userWithTx = await prisma.user.create({
      data: {
        username: `test-usertx-${timestamp}`,
        password: passwordHash,
        fullName: 'User With Transaction',
        role: 'warehouse_staff',
        status: 'approved',
      },
    })

    // Create a product and transaction linked to userWithTx
    const dummyProduct = await prisma.product.create({
      data: {
        itemCode: `TEST-PROD-UM-${timestamp}`,
        description: 'Dummy Product for UM Test',
        unit: 'PCS',
        warehouse: 'WPK',
        location: 'A-01',
        quantity: 100,
        itemType: 'Packaging',
      },
    })

    await prisma.transaction.create({
      data: {
        productId: dummyProduct.id,
        type: 'receive',
        quantity: 10,
        status: 'pending',
        itemSnapshot: { name: 'Dummy Product for UM Test' },
        createdById: userWithTx.id,
      },
    })
  })

  afterAll(async () => {
    // Cleanup created test records
    try {
      await prisma.transaction.deleteMany({
        where: { createdById: userWithTx?.id },
      })
      await prisma.product.deleteMany({
        where: { itemCode: `TEST-PROD-UM-${timestamp}` },
      })
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [adminUser?.id, staffUser?.id, targetUser?.id, userWithTx?.id].filter(Boolean),
          },
        },
      })
    } catch (cleanupErr) {
      console.warn('Cleanup error in user-management.test.ts:', cleanupErr)
    }
    await prisma.$disconnect()
  })

  // =========================================================================
  // 1. PATCH /users/:id/role
  // =========================================================================
  describe('PATCH /users/:id/role', () => {
    it('should return 404 for non-existent user and NOT return 200 or Memory Mode', async () => {
      const res = await request(app)
        .patch('/users/999999/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'supervisor' })

      expect(res.status).toBe(404)
      expect(res.status).not.toBe(200)
      expect(res.body).toHaveProperty('error')
      expect(JSON.stringify(res.body)).not.toContain('Memory Mode')
    })

    it('should return 400 for invalid role', async () => {
      const res = await request(app)
        .patch(`/users/${targetUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'invalid_role_xyz' })

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })

    it('should return 403 when called by Staff', async () => {
      const res = await request(app)
        .patch(`/users/${targetUser.id}/role`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ role: 'supervisor' })

      expect(res.status).toBe(403)
    })

    it('should successfully update role in database for valid user', async () => {
      const res = await request(app)
        .patch(`/users/${targetUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'supervisor' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.user.role).toBe('supervisor')

      // Verify database state directly
      const dbUser = await prisma.user.findUnique({ where: { id: targetUser.id } })
      expect(dbUser?.role).toBe('supervisor')
    })
  })

  // =========================================================================
  // 2. PATCH /users/:id/reset-password
  // =========================================================================
  describe('PATCH /users/:id/reset-password', () => {
    it('should return 404 for non-existent user and NOT return 200 or Memory Mode', async () => {
      const res = await request(app)
        .patch('/users/999999/reset-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'NewPassword123' })

      expect(res.status).toBe(404)
      expect(res.status).not.toBe(200)
      expect(res.body).toHaveProperty('error')
      expect(JSON.stringify(res.body)).not.toContain('Memory Mode')
    })

    it('should return 400 when password is shorter than 6 characters', async () => {
      const res = await request(app)
        .patch(`/users/${targetUser.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: '123' })

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })

    it('should successfully reset password in database for valid user', async () => {
      const res = await request(app)
        .patch(`/users/${targetUser.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'BrandNewPassword456' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify database state directly: new password can be verified with bcrypt
      const dbUser = await prisma.user.findUnique({ where: { id: targetUser.id } })
      const isValid = await bcrypt.compare('BrandNewPassword456', dbUser!.password)
      expect(isValid).toBe(true)
    })
  })

  // =========================================================================
  // 3. PATCH /users/:id
  // =========================================================================
  describe('PATCH /users/:id', () => {
    it('should return 404 for non-existent user and NOT return 200 or Memory Mode', async () => {
      const res = await request(app)
        .patch('/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'Ghost User', employeeId: 'EMP-GHOST' })

      expect(res.status).toBe(404)
      expect(res.status).not.toBe(200)
      expect(res.body).toHaveProperty('error')
      expect(JSON.stringify(res.body)).not.toContain('Memory Mode')
    })

    it('should return 400 when fullName is empty', async () => {
      const res = await request(app)
        .patch(`/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: '', employeeId: 'EMP-001' })

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })

    it('should successfully update user info in database for valid user', async () => {
      const res = await request(app)
        .patch(`/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ fullName: 'Updated Full Name', employeeId: 'EMP-UPDATED' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.user.fullName).toBe('Updated Full Name')
      expect(res.body.user.employeeId).toBe('EMP-UPDATED')

      // Verify database state directly
      const dbUser = await prisma.user.findUnique({ where: { id: targetUser.id } })
      expect(dbUser?.fullName).toBe('Updated Full Name')
      expect(dbUser?.employeeId).toBe('EMP-UPDATED')
    })
  })

  // =========================================================================
  // 4. PATCH /users/:id/status
  // =========================================================================
  describe('PATCH /users/:id/status', () => {
    it('should return 404 for non-existent user and NOT return 200 or Memory Mode', async () => {
      const res = await request(app)
        .patch('/users/999999/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled' })

      expect(res.status).toBe(404)
      expect(res.status).not.toBe(200)
      expect(res.body).toHaveProperty('error')
      expect(JSON.stringify(res.body)).not.toContain('Memory Mode')
    })

    it('should return 400 for invalid status', async () => {
      const res = await request(app)
        .patch(`/users/${targetUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'banned_xyz' })

      expect(res.status).toBe(400)
      expect(res.body).toHaveProperty('error')
    })

    it('should successfully update status to disabled and back to approved in database', async () => {
      // 1. Disable
      const disableRes = await request(app)
        .patch(`/users/${targetUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled' })

      expect(disableRes.status).toBe(200)
      expect(disableRes.body.success).toBe(true)
      let dbUser = await prisma.user.findUnique({ where: { id: targetUser.id } })
      expect(dbUser?.status).toBe('disabled')

      // 2. Re-approve
      const enableRes = await request(app)
        .patch(`/users/${targetUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })

      expect(enableRes.status).toBe(200)
      expect(enableRes.body.success).toBe(true)
      dbUser = await prisma.user.findUnique({ where: { id: targetUser.id } })
      expect(dbUser?.status).toBe('approved')
    })
  })

  // =========================================================================
  // 5. DELETE /users/:id
  // =========================================================================
  describe('DELETE /users/:id', () => {
    it('should return 404 for non-existent user and NOT return 200 or Memory Mode', async () => {
      const res = await request(app)
        .delete('/users/999999')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(404)
      expect(res.status).not.toBe(200)
      expect(res.body).toHaveProperty('error')
      expect(JSON.stringify(res.body)).not.toContain('Memory Mode')
    })

    it('should return 409 Conflict when user has transaction history and NOT delete', async () => {
      const res = await request(app)
        .delete(`/users/${userWithTx.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(409)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('ประวัติการทำรายการ')

      // User must still exist in DB
      const dbUser = await prisma.user.findUnique({ where: { id: userWithTx.id } })
      expect(dbUser).not.toBeNull()
    })

    it('should successfully delete a clean user with no transaction history', async () => {
      // Create a dedicated clean user to delete
      const cleanUser = await prisma.user.create({
        data: {
          username: `test-clean-${Date.now()}`,
          password: 'Password123',
          fullName: 'Clean User To Delete',
          role: 'warehouse_staff',
          status: 'approved',
        },
      })

      const res = await request(app)
        .delete(`/users/${cleanUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      // Verify deletion in database
      const dbUser = await prisma.user.findUnique({ where: { id: cleanUser.id } })
      expect(dbUser).toBeNull()
    })
  })
})
