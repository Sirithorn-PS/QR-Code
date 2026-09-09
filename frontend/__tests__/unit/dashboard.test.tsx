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

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth.fetchTransactions).mockResolvedValue(mockTransactions)
    vi.mocked(auth.fetchProducts).mockResolvedValue(mockProducts)
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

    // Recent transactions title for Staff
    expect(screen.getByText('รายการของคุณล่าสุด')).toBeInTheDocument()
    expect(screen.getByText('5 รายการประวัติการทำรายการล่าสุดของคุณ')).toBeInTheDocument()

    // Quick action link for Staff points to My Transactions
    expect(screen.getByText('ดูรายการของฉัน')).toBeInTheDocument()
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

  it('3. Supervisor role maintains existing warehouse-wide transaction labels', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 10,
      username: 'supervisor',
      fullName: 'ผู้ควบคุมดูแลระบบ (Supervisor)',
      role: 'supervisor',
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('กิจกรรมธุรกรรมคลังสินค้า')).toBeInTheDocument()
      expect(screen.getByText('รับเข้าวันนี้')).toBeInTheDocument()
      expect(screen.getByText('เบิกออกวันนี้')).toBeInTheDocument()
      expect(screen.getByText('รายการรอยืนยัน')).toBeInTheDocument()
    })

    // Ensure personal labels are NOT shown for supervisor
    expect(screen.queryByText('สถิติการทำงานของฉัน')).not.toBeInTheDocument()
    expect(screen.queryByText('คุณรับเข้าวันนี้')).not.toBeInTheDocument()
    expect(screen.queryByText('คุณเบิกออกวันนี้')).not.toBeInTheDocument()
    expect(screen.queryByText('รายการของคุณที่รอยืนยัน')).not.toBeInTheDocument()

    // 7-day trend title for Supervisor
    expect(screen.getByText('สรุปการรับเข้า - เบิกออก 7 วันล่าสุด')).toBeInTheDocument()

    // Recent transactions title for Supervisor
    expect(screen.getByText('รายการล่าสุด (Recent Transactions)')).toBeInTheDocument()
    expect(screen.getByText('5 รายการประวัติการทำรายการล่าสุดในระบบ')).toBeInTheDocument()

    // Quick action link for Supervisor points to reports
    expect(screen.getByText('ดูรายงานทั้งหมด')).toBeInTheDocument()
  })
})
