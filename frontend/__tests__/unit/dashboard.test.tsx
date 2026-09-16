import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import DashboardPage from '@/app/dashboard/page'
import * as auth from '@/lib/auth'

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    fetchTransactions: vi.fn(),
    fetchProducts: vi.fn(),
    getUser: vi.fn(),
    getUsers: vi.fn(),
  }
})

describe('Dashboard Page — Personal Activity & Warehouse Overview (STEP 4.25)', () => {
  const mockProductSnapshot1: auth.Product = {
    id: 1,
    itemCode: 'YAM-GAL-01',
    productId: 'P-01',
    name: '1L Gallon Yamalube',
    unit: 'GALLON',
    warehouse: 'WPK',
    location: 'A-01',
    quantity: 120,
    itemType: 'Packaging',
  }

  const mockProductSnapshot2: auth.Product = {
    id: 2,
    itemCode: 'YAM-CAP-01',
    productId: 'P-02',
    name: 'Cap Yamalube',
    unit: 'PIECE',
    warehouse: 'WPK',
    location: 'B-01',
    quantity: 200,
    itemType: 'Packaging',
  }

  const mockTransactions: auth.StockTransaction[] = [
    {
      id: 101,
      productId: 1,
      type: 'receive',
      quantity: 120,
      status: 'confirmed',
      note: 'Normal receive',
      createdAt: new Date().toISOString(),
      confirmedAt: null,
      rejectedAt: null,
      itemSnapshot: mockProductSnapshot1,
      createdBy: { username: 'staff', fullName: 'Staff User' },
      product: {
        id: 1,
        itemCode: 'YAM-GAL-01',
        name: '1L Gallon Yamalube',
        description: '1L Gallon Yamalube Plastic',
        unit: 'GALLON',
        warehouse: 'WPK',
        location: 'A-01',
        quantity: 120,
        itemType: 'Packaging',
      },
    },
    {
      id: 102,
      productId: 2,
      type: 'issue',
      quantity: 30,
      status: 'pending',
      note: 'Production issue',
      createdAt: new Date().toISOString(),
      confirmedAt: null,
      rejectedAt: null,
      itemSnapshot: mockProductSnapshot2,
      createdBy: { username: 'staff', fullName: 'Staff User' },
      product: {
        id: 2,
        itemCode: 'YAM-CAP-01',
        name: 'Cap Yamalube',
        description: 'Cap Blue Yamalube',
        unit: 'PIECE',
        warehouse: 'WPK',
        location: 'B-01',
        quantity: 200,
        itemType: 'Packaging',
      },
    },
  ]

  const mockProducts: auth.Product[] = [
    {
      id: 1,
      itemCode: 'YAM-GAL-01',
      productId: 'P-01',
      name: '1L Gallon Yamalube',
      unit: 'GALLON',
      warehouse: 'WPK',
      location: 'A-01',
      quantity: 120,
      itemType: 'Packaging',
      minStock: 50,
    },
    {
      id: 2,
      itemCode: 'YAM-CAP-01',
      productId: 'P-02',
      name: 'Cap Yamalube',
      unit: 'PIECE',
      warehouse: 'WPK',
      location: 'B-01',
      quantity: 15,
      itemType: 'Packaging',
      minStock: 20, // Low stock because quantity 15 <= minStock 20
    },
    {
      id: 3,
      itemCode: 'YAM-OIL-FG',
      productId: 'P-03',
      name: 'Yamalube Finished Oil',
      unit: 'BOTTLE',
      warehouse: 'WPK',
      location: 'C-01',
      quantity: 500,
      itemType: 'FG', // Not Packaging
      minStock: 100,
    },
  ]

  const mockUsers: auth.UserItem[] = [
    {
      id: 1,
      username: 'admin',
      fullName: 'สมชาย ผู้ดูแลระบบ',
      employeeId: 'EMP-001',
      role: 'admin',
      status: 'approved',
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 2,
      username: 'supervisor',
      fullName: 'สมศักดิ์ หัวหน้างาน',
      employeeId: 'EMP-002',
      role: 'supervisor',
      status: 'approved',
      createdAt: '2026-09-02T08:00:00.000Z',
    },
    {
      id: 3,
      username: 'staff1',
      fullName: 'พนักงานคลังสินค้า หนึ่ง',
      employeeId: 'EMP-003',
      role: 'warehouse_staff',
      status: 'approved',
      createdAt: '2026-09-03T08:00:00.000Z',
    },
    {
      id: 4,
      username: 'staff2_disabled',
      fullName: 'พนักงานถูกระงับ',
      employeeId: 'EMP-004',
      role: 'warehouse_staff',
      status: 'disabled',
      createdAt: '2026-09-04T08:00:00.000Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth.fetchTransactions).mockResolvedValue(mockTransactions)
    vi.mocked(auth.fetchProducts).mockResolvedValue(mockProducts)
    vi.mocked(auth.getUsers).mockResolvedValue(mockUsers)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('1. Staff role displays Personal Activity section with clear personal labels', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 7,
      username: 'staff',
      fullName: 'พนักงานคลังสินค้า (Staff)',
      role: 'warehouse_staff',
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('สถิติการทำงานของฉัน')).toBeInTheDocument()
      expect(screen.getByText('คุณรับเข้าวันนี้')).toBeInTheDocument()
      expect(screen.getByText('คุณเบิกออกวันนี้')).toBeInTheDocument()
      expect(screen.getByText('รายการของคุณที่รอยืนยัน')).toBeInTheDocument()
    })

    // Subtitle & badge for Staff
    expect(screen.getByText('สรุปรายการรับเข้า เบิกออก และรายการของคุณที่รอยืนยัน')).toBeInTheDocument()
    expect(screen.getByText('สถิติเฉพาะบุคคล (My Activity)')).toBeInTheDocument()

    // 7-day trend title for Staff
    expect(screen.getByText('สรุปการทำงานของคุณ 7 วันล่าสุด')).toBeInTheDocument()

    // Recent transactions title & subtitle for Staff
    expect(screen.getByText('รายการของคุณล่าสุด')).toBeInTheDocument()
    expect(screen.getByText('ประวัติการทำรายการล่าสุดของคุณ')).toBeInTheDocument()
    expect(screen.getByText('แสดง 1 - 2 จากทั้งหมด 2 รายการ')).toBeInTheDocument()

    // Quick action section is removed from Staff Dashboard to avoid navigation redundancy
    expect(screen.queryByText('เมนูด่วน (Quick Action)')).not.toBeInTheDocument()
  })

  it('2. Staff role displays Warehouse Overview section with aggregate metrics', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 7,
      username: 'staff',
      fullName: 'พนักงานคลังสินค้า (Staff)',
      role: 'warehouse_staff',
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('ภาพรวมคลังสินค้า (Warehouse Overview)')).toBeInTheDocument()
      expect(screen.getByText('ข้อมูลรวมทั้งคลัง (Warehouse Aggregate)')).toBeInTheDocument()
    })

    // Aggregate cards
    expect(screen.getByText('Packaging ทั้งหมด')).toBeInTheDocument()
    expect(screen.getByText('จำนวนคงเหลือรวม')).toBeInTheDocument()
    expect(screen.getByText('สต็อกใกล้หมด')).toBeInTheDocument()

    // Packaging count should only be 2 (mockProducts has 2 Packaging items, 1 FG)
    const countElements = screen.getAllByText('2')
    expect(countElements.length).toBeGreaterThan(0)
  })

  it('3. Supervisor role displays warehouse KPI overview, charts, quick actions, and recent transactions', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 10,
      username: 'supervisor',
      fullName: 'ผู้ควบคุมดูแลระบบ (Supervisor)',
      role: 'supervisor',
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('PACKAGING ทั้งหมด')).toBeInTheDocument()
      expect(screen.getByText('จำนวนคงเหลือรวม')).toBeInTheDocument()
      expect(screen.getByText('สต็อกใกล้หมด')).toBeInTheDocument()
      expect(screen.getByText('สินค้าหมด (OUT OF STOCK)')).toBeInTheDocument()
    })

    // Ensure personal labels are NOT shown for supervisor
    expect(screen.queryByText('สถิติการทำงานของฉัน')).not.toBeInTheDocument()
    expect(screen.queryByText('คุณรับเข้าวันนี้')).not.toBeInTheDocument()
    expect(screen.queryByText('คุณเบิกออกวันนี้')).not.toBeInTheDocument()
    expect(screen.queryByText('รายการของคุณที่รอยืนยัน')).not.toBeInTheDocument()

    // 7-day trend title & summary cards for Supervisor
    expect(screen.getByText('สรุปการรับเข้า - เบิกออก 7 วันล่าสุด')).toBeInTheDocument()
    expect(screen.getByText('รับเข้ารวม (7 วัน)')).toBeInTheDocument()
    expect(screen.getByText('เบิกออกรวม (7 วัน)')).toBeInTheDocument()

    // Donut chart title
    expect(screen.getByText('สัดส่วนวัตถุดิบบรรจุภัณฑ์')).toBeInTheDocument()

    // Action Required
    expect(screen.getByText('งานที่ต้องดำเนินการ (Action Required)')).toBeInTheDocument()

    // Quick Actions
    expect(screen.getByText('เมนูดำเนินการด่วน (Supervisor Quick Actions)')).toBeInTheDocument()
    expect(screen.getByText('ตรวจสอบรายการ')).toBeInTheDocument()
    expect(screen.getByText('ดูสต็อกบรรจุภัณฑ์')).toBeInTheDocument()
    expect(screen.getByText('ธุรกรรมทั้งหมด')).toBeInTheDocument()
    expect(screen.getByText('ดูรายงานทั้งหมด')).toBeInTheDocument()

    // Recent transactions title & subtitle for Supervisor
    expect(screen.getByText('รายการล่าสุด (Recent Transactions)')).toBeInTheDocument()
    expect(screen.getByText('ประวัติการทำรายการล่าสุดในระบบ')).toBeInTheDocument()
    expect(screen.getByText('แสดง 1 - 2 จากทั้งหมด 2 รายการ')).toBeInTheDocument()
  })

  it('4. Admin role displays Admin Dashboard with User & System management and no warehouse clutter', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 1,
      username: 'admin',
      fullName: 'แอดมินระบบ (Admin)',
      role: 'admin',
    })

    render(<DashboardPage />)

    await waitFor(() => {
      // Header
      expect(screen.getByText('แผงควบคุมระบบ')).toBeInTheDocument()
      expect(screen.getByText('ภาพรวมระบบ ผู้ใช้งาน และสถานะการทำงาน')).toBeInTheDocument()
      expect(screen.getByText('จัดการผู้ใช้งาน')).toBeInTheDocument()
    })

    // 1. Top 3 Summary Cards
    expect(screen.getAllByText('ผู้ใช้งานทั้งหมด').length).toBeGreaterThan(0)
    expect(screen.getByText('บัญชีที่ใช้งานได้')).toBeInTheDocument()
    expect(screen.getByText('บัญชีที่ถูกระงับ')).toBeInTheDocument()
    expect(screen.getByText('บัญชีผู้ใช้ที่ลงทะเบียนในระบบ')).toBeInTheDocument()
    expect(screen.getByText('พร้อมเข้าใช้งานระบบ')).toBeInTheDocument()
    expect(screen.getByText('ระงับการใช้งาน / ปฏิเสธ')).toBeInTheDocument()

    // 2. Middle Section: Users by Role (Donut) & System Status
    expect(screen.getByText('ผู้ใช้งานตามบทบาท')).toBeInTheDocument()
    expect(screen.getAllByText(/ผู้ดูแลระบบ/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('หัวหน้างาน (Supervisor)').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/พนักงาน/).length).toBeGreaterThan(0)

    expect(screen.getByText('สถานะระบบ (System Status)')).toBeInTheDocument()
    expect(screen.getByText('Web Application')).toBeInTheDocument()
    expect(screen.getByText('API Gateway')).toBeInTheDocument()
    expect(screen.getByText('Database Service')).toBeInTheDocument()
    expect(screen.getByText('Access Control (RBAC)')).toBeInTheDocument()

    // 3. Lower Section: Recent Users Table
    expect(screen.getByText('สถานะผู้ใช้งานล่าสุด (Recent Users)')).toBeInTheDocument()
    expect(screen.getByText('รายชื่อบัญชีผู้ใช้และสถานะการอนุญาตล่าสุดในระบบ')).toBeInTheDocument()
    expect(screen.getByText('สมชาย ผู้ดูแลระบบ')).toBeInTheDocument()
    expect(screen.getByText('สมศักดิ์ หัวหน้างาน')).toBeInTheDocument()
    expect(screen.getByText('พนักงานคลังสินค้า หนึ่ง')).toBeInTheDocument()
    expect(screen.getByText('พนักงานถูกระงับ')).toBeInTheDocument()

    // 4. Verify Warehouse operations are NOT shown for Admin
    expect(screen.queryByText('กิจกรรมธุรกรรมคลังสินค้า')).not.toBeInTheDocument()
    expect(screen.queryByText('สถิติการทำงานของฉัน')).not.toBeInTheDocument()
    expect(screen.queryByText('ภาพรวมคลังสินค้า (Warehouse Overview)')).not.toBeInTheDocument()
    expect(screen.queryByText('สรุปการรับเข้า - เบิกออก 7 วันล่าสุด')).not.toBeInTheDocument()
    expect(screen.queryByText('สรุปการทำงานของคุณ 7 วันล่าสุด')).not.toBeInTheDocument()
  })

  it('5. Recent transactions pagination displays pagination controls when more than 5 items', async () => {
    const manyMockTransactions: auth.StockTransaction[] = Array.from({ length: 12 }, (_, i) => ({
      id: 200 + i,
      productId: 1,
      type: i % 2 === 0 ? 'receive' : 'issue',
      quantity: 10 + i,
      status: 'confirmed',
      note: `Tx note ${i + 1}`,
      createdAt: new Date().toISOString(),
      confirmedAt: null,
      rejectedAt: null,
      itemSnapshot: mockProductSnapshot1,
      createdBy: { username: 'staff', fullName: 'Staff User' },
      product: {
        id: 1,
        itemCode: 'YAM-GAL-01',
        name: '1L Gallon Yamalube',
        description: '1L Gallon Yamalube Plastic',
        unit: 'GALLON',
        warehouse: 'WPK',
        location: 'A-01',
        quantity: 120,
        itemType: 'Packaging',
      },
    }))

    vi.mocked(auth.getUser).mockReturnValue({
      id: 7,
      username: 'staff',
      fullName: 'พนักงานคลังสินค้า (Staff)',
      role: 'warehouse_staff',
    })
    vi.mocked(auth.fetchTransactions).mockResolvedValue(manyMockTransactions)

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('แสดง 1 - 5 จากทั้งหมด 12 รายการ')).toBeInTheDocument()
    })

    // Expect page numbers 1, 2, 3 and navigation buttons to be present
    expect(screen.getByRole('button', { name: 'หน้า 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'หน้า 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'หน้า 3' })).toBeInTheDocument()
    expect(screen.getByTitle('หน้าก่อนหน้า')).toBeInTheDocument()
    expect(screen.getByTitle('หน้าถัดไป')).toBeInTheDocument()
  })
})

