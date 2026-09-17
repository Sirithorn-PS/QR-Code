import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import { app, prisma } from '../src/index'
import * as xlsx from 'xlsx'

const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret'

function makeToken(user: { id: number; username: string; role: string }) {
  return jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, {
    expiresIn: '1h',
  })
}

describe('Backend Excel Export API Integration Tests (GET /reports/export-excel)', () => {
  let supervisorToken: string
  let staffToken: string
  let adminToken: string

  beforeAll(async () => {
    supervisorToken = makeToken({ id: 101, username: 'test-supervisor', role: 'supervisor' })
    staffToken = makeToken({ id: 102, username: 'test-staff', role: 'warehouse_staff' })
    adminToken = makeToken({ id: 103, username: 'test-admin', role: 'admin' })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Authentication & Authorization Guards', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/reports/export-excel')
      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('error')
    })

    it('should reject invalid token with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/reports/export-excel')
        .set('Authorization', 'Bearer invalid.token.here')
      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('error')
    })

    it('should reject Staff with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/reports/export-excel')
        .set('Authorization', `Bearer ${staffToken}`)
      expect(res.status).toBe(403)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('Forbidden')
    })

    it('should reject Admin with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/reports/export-excel')
        .set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(403)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toContain('Forbidden')
    })
  })

  describe('Filter Validation', () => {
    it('should return 400 when status is invalid', async () => {
      const res = await request(app)
        .get('/reports/export-excel?status=unknown_status')
        .set('Authorization', `Bearer ${supervisorToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('สถานะไม่ถูกต้อง')
    })

    it('should return 400 when category is invalid', async () => {
      const res = await request(app)
        .get('/reports/export-excel?category=invalid_category')
        .set('Authorization', `Bearer ${supervisorToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('หมวดหมู่ไม่ถูกต้อง')
    })

    it('should return 400 when startDate is provided without endDate', async () => {
      const res = await request(app)
        .get('/reports/export-excel?startDate=2026-08-01')
        .set('Authorization', `Bearer ${supervisorToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('กรุณาระบุทั้งวันที่เริ่มต้นและวันที่สิ้นสุด')
    })

    it('should return 400 when date format is invalid', async () => {
      const res = await request(app)
        .get('/reports/export-excel?startDate=abc&endDate=def')
        .set('Authorization', `Bearer ${supervisorToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('รูปแบบวันที่ไม่ถูกต้อง')
    })

    it('should return 400 when startDate is greater than endDate', async () => {
      const res = await request(app)
        .get('/reports/export-excel?startDate=2026-09-01&endDate=2026-08-01')
        .set('Authorization', `Bearer ${supervisorToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด')
    })

    it('should return 404 when no records match filter', async () => {
      const res = await request(app)
        .get('/reports/export-excel?search=NON_EXISTENT_ITEM_CODE_999999')
        .set('Authorization', `Bearer ${supervisorToken}`)
      expect(res.status).toBe(404)
      expect(res.body.error).toContain('ไม่พบข้อมูลสำหรับส่งออก')
    })
  })

  describe('Successful Export & Excel Content Verification', () => {
    it('should allow Supervisor to export all transactions as XLSX', async () => {
      const res = await request(app)
        .get('/reports/export-excel')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .responseType('blob')

      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain('spreadsheetml.sheet')
      expect(res.headers['content-disposition']).toMatch(/attachment; filename="WPK_MMS_Transaction_Report_All_\d{8}\.xlsx"/)

      // Parse the returned buffer using xlsx
      const workbook = xlsx.read(res.body, { type: 'buffer' })
      expect(workbook.SheetNames).toEqual(['Transactions'])

      const sheet = workbook.Sheets['Transactions']
      expect(sheet).toBeDefined()

      const jsonData = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet)
      expect(jsonData.length).toBeGreaterThan(0)

      const firstRow = jsonData[0]
      expect(firstRow).toHaveProperty('ลำดับ')
      expect(firstRow).toHaveProperty('รหัสธุรกรรม')
      expect(firstRow).toHaveProperty('วันที่และเวลา')
      expect(firstRow).toHaveProperty('รหัสสินค้า')
      expect(firstRow).toHaveProperty('ชื่อสินค้า')
      expect(firstRow).toHaveProperty('ประเภทรายการ')
      expect(firstRow).toHaveProperty('จำนวน')
      expect(firstRow).toHaveProperty('หน่วยนับ')
      expect(firstRow).toHaveProperty('คลังสินค้า')
      expect(firstRow).toHaveProperty('ตำแหน่งจัดเก็บ')
      expect(firstRow).toHaveProperty('สถานะ')
      expect(firstRow).toHaveProperty('ผู้ดำเนินการ')
      expect(firstRow).toHaveProperty('ผู้อนุมัติ/ปฏิเสธ')
      expect(firstRow).toHaveProperty('วันที่อนุมัติ/ปฏิเสธ')
      expect(firstRow).toHaveProperty('หมายเหตุ')
      expect(firstRow).toHaveProperty('รายละเอียด Lot (FIFO)')

      // Verify no sensitive data leaked into Excel
      for (const row of jsonData) {
        expect(row).not.toHaveProperty('password')
        expect(row).not.toHaveProperty('passwordHash')
        expect(row).not.toHaveProperty('token')
        expect(row).not.toHaveProperty('jwt')
      }
    })

    it('should support date range filter and format filename accordingly', async () => {
      const res = await request(app)
        .get('/reports/export-excel?startDate=2026-01-01&endDate=2026-12-31')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .responseType('blob')

      expect(res.status).toBe(200)
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="WPK_MMS_Transaction_Report_2026-01-01_to_2026-12-31.xlsx"'
      )

      const workbook = xlsx.read(res.body, { type: 'buffer' })
      expect(workbook.SheetNames).toEqual(['Transactions'])
      const jsonData = xlsx.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets['Transactions'])
      expect(jsonData.length).toBeGreaterThan(0)
    })

    it('should filter by category=adjust and category=normal properly', async () => {
      const adjustRes = await request(app)
        .get('/reports/export-excel?category=adjust')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .responseType('blob')

      // Either 200 or 404 depending on whether stock adjustment records exist in DB
      if (adjustRes.status === 200) {
        const wb = xlsx.read(adjustRes.body, { type: 'buffer' })
        const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Transactions'])
        for (const row of data) {
          expect(String(row['หมายเหตุ'])).toContain('ปรับปรุงสต็อก')
        }
      } else {
        expect(adjustRes.status).toBe(404)
      }

      const normalRes = await request(app)
        .get('/reports/export-excel?category=normal')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .responseType('blob')

      expect(normalRes.status).toBe(200)
      const normalWb = xlsx.read(normalRes.body, { type: 'buffer' })
      const normalData = xlsx.utils.sheet_to_json<Record<string, unknown>>(normalWb.Sheets['Transactions'])
      for (const row of normalData) {
        expect(String(row['หมายเหตุ'])).not.toContain('ปรับปรุงสต็อก')
      }
    })
  })
})
