import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReportsPage from '@/app/reports/page'
import * as auth from '@/lib/auth'

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    fetchTransactions: vi.fn(),
    exportTransactionsToExcel: vi.fn(),
    downloadBlob: vi.fn(),
    getUser: vi.fn(),
  }
})

describe('Reports Page — Excel Export UI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth.fetchTransactions).mockResolvedValue([
      {
        id: 1,
        productId: 101,
        type: 'receive',
        quantity: 50,
        status: 'confirmed',
        note: 'Normal receive',
        createdAt: '2026-08-15T10:00:00.000Z',
        createdBy: { id: 1, fullName: 'Staff One', role: 'warehouse_staff' },
        itemSnapshot: { name: 'Item Alpha', itemCode: 'ITEM-01' },
      } as unknown as auth.StockTransaction,
    ])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('1. Supervisor sees "ส่งออก Excel" button', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 2,
      username: 'sup01',
      fullName: 'Supervisor User',
      role: 'supervisor',
    })

    render(<ReportsPage />)

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /ส่งออก Excel/i })
      expect(button).toBeInTheDocument()
    })
  })

  it('2. Staff does NOT see "ส่งออก Excel" button', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 3,
      username: 'staff01',
      fullName: 'Warehouse Staff',
      role: 'warehouse_staff',
    })

    render(<ReportsPage />)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /ส่งออก Excel/i })).not.toBeInTheDocument()
    })
  })

  it('3. Admin does NOT see "ส่งออก Excel" button', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 1,
      username: 'admin01',
      fullName: 'Admin User',
      role: 'admin',
    })

    render(<ReportsPage />)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /ส่งออก Excel/i })).not.toBeInTheDocument()
    })
  })

  it('4 & 5 & 6. Clicking Export calls exportTransactionsToExcel with current filters, and calls downloadBlob on success', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 2,
      username: 'sup01',
      fullName: 'Supervisor User',
      role: 'supervisor',
    })

    const fakeBlob = new Blob(['mock excel content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    vi.mocked(auth.exportTransactionsToExcel).mockResolvedValue({
      blob: fakeBlob,
      filename: 'WPK_MMS_Transaction_Report_20260815.xlsx',
    })

    render(<ReportsPage />)

    const exportBtn = await screen.findByRole('button', { name: /ส่งออก Excel/i })
    expect(exportBtn).toBeInTheDocument()

    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(auth.exportTransactionsToExcel).toHaveBeenCalledTimes(1)
    })

    // Check that downloadBlob was called with the returned blob and filename
    await waitFor(() => {
      expect(auth.downloadBlob).toHaveBeenCalledWith(fakeBlob, 'WPK_MMS_Transaction_Report_20260815.xlsx')
      expect(screen.getByText('ส่งออกรายงาน Excel สำเร็จ')).toBeInTheDocument()
    })
  })

  it('7 & 8. Shows loading state, disables button, and prevents duplicate requests while exporting', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 2,
      username: 'sup01',
      fullName: 'Supervisor User',
      role: 'supervisor',
    })

    let resolveExport: (val: { blob: Blob; filename: string }) => void = () => {}
    const exportPromise = new Promise<{ blob: Blob; filename: string }>((resolve) => {
      resolveExport = resolve
    })
    vi.mocked(auth.exportTransactionsToExcel).mockReturnValue(exportPromise)

    render(<ReportsPage />)

    const exportBtn = await screen.findByRole('button', { name: /ส่งออก Excel/i })
    fireEvent.click(exportBtn)

    // Button should now be disabled and show loading text
    expect(exportBtn).toBeDisabled()
    expect(screen.getByText('กำลังส่งออก...')).toBeInTheDocument()

    // Second click should not invoke helper again
    fireEvent.click(exportBtn)
    expect(auth.exportTransactionsToExcel).toHaveBeenCalledTimes(1)

    // Resolve export
    resolveExport({
      blob: new Blob(['data']),
      filename: 'test.xlsx',
    })

    await waitFor(() => {
      expect(exportBtn).not.toBeDisabled()
      expect(screen.getByText('ส่งออก Excel')).toBeInTheDocument()
    })
  })

  it('9. When 404 (No data found), displays Thai error message and resets loading', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 2,
      username: 'sup01',
      fullName: 'Supervisor User',
      role: 'supervisor',
    })

    vi.mocked(auth.exportTransactionsToExcel).mockRejectedValue(
      new Error('ไม่พบข้อมูลสำหรับส่งออกตามเงื่อนไขที่ระบุ')
    )

    render(<ReportsPage />)

    const exportBtn = await screen.findByRole('button', { name: /ส่งออก Excel/i })
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(screen.getByText('ไม่พบข้อมูลสำหรับส่งออกตามเงื่อนไขที่ระบุ')).toBeInTheDocument()
      expect(exportBtn).not.toBeDisabled()
    })

    // downloadBlob should NOT have been called
    expect(auth.downloadBlob).not.toHaveBeenCalled()
  })

  it('10 & 11. When 403 (Forbidden), displays error and resets loading state', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 2,
      username: 'sup01',
      fullName: 'Supervisor User',
      role: 'supervisor',
    })

    vi.mocked(auth.exportTransactionsToExcel).mockRejectedValue(
      new Error('คุณไม่มีสิทธิ์ส่งออกข้อมูล')
    )

    render(<ReportsPage />)

    const exportBtn = await screen.findByRole('button', { name: /ส่งออก Excel/i })
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(screen.getByText('คุณไม่มีสิทธิ์ส่งออกข้อมูล')).toBeInTheDocument()
      expect(exportBtn).not.toBeDisabled()
    })

    expect(auth.downloadBlob).not.toHaveBeenCalled()
  })

  it('12. Existing report transactions table renders properly', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 2,
      username: 'sup01',
      fullName: 'Supervisor User',
      role: 'supervisor',
    })

    render(<ReportsPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Item Alpha').length).toBeGreaterThan(0)
      expect(screen.getAllByText('ITEM-01').length).toBeGreaterThan(0)
    })
  })

  it('13. Date Range: Warns when Start Date is selected but End Date is missing', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 2,
      username: 'sup01',
      fullName: 'Supervisor User',
      role: 'supervisor',
    })

    render(<ReportsPage />)

    // Select custom date filter
    const dateSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(dateSelect, { target: { value: 'custom' } })

    const startInput = await screen.findByLabelText(/วันที่เริ่มต้น/i)
    fireEvent.change(startInput, { target: { value: '2026-08-01' } })

    const exportBtn = screen.getByRole('button', { name: /ส่งออก Excel/i })
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(screen.getByText('กรุณาระบุวันที่สิ้นสุดให้ครบถ้วน')).toBeInTheDocument()
    })
    expect(auth.exportTransactionsToExcel).not.toHaveBeenCalled()
  })

  it('14. Date Range: Warns when End Date is selected but Start Date is missing', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 2,
      username: 'sup01',
      fullName: 'Supervisor User',
      role: 'supervisor',
    })

    render(<ReportsPage />)

    const dateSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(dateSelect, { target: { value: 'custom' } })

    const endInput = await screen.findByLabelText(/วันที่สิ้นสุด/i)
    fireEvent.change(endInput, { target: { value: '2026-08-31' } })

    const exportBtn = screen.getByRole('button', { name: /ส่งออก Excel/i })
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(screen.getByText('กรุณาระบุวันที่เริ่มต้นให้ครบถ้วน')).toBeInTheDocument()
    })
    expect(auth.exportTransactionsToExcel).not.toHaveBeenCalled()
  })

  it('15. Date Range: Warns when Start Date is greater than End Date', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 2,
      username: 'sup01',
      fullName: 'Supervisor User',
      role: 'supervisor',
    })

    render(<ReportsPage />)

    const dateSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(dateSelect, { target: { value: 'custom' } })

    const startInput = await screen.findByLabelText(/วันที่เริ่มต้น/i)
    const endInput = await screen.findByLabelText(/วันที่สิ้นสุด/i)

    fireEvent.change(startInput, { target: { value: '2026-08-31' } })
    fireEvent.change(endInput, { target: { value: '2026-08-01' } })

    const exportBtn = screen.getByRole('button', { name: /ส่งออก Excel/i })
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(screen.getByText('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด')).toBeInTheDocument()
    })
    expect(auth.exportTransactionsToExcel).not.toHaveBeenCalled()
  })

  it('16. Date Range: Successfully exports when Start Date and End Date are identical (Same day)', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 2,
      username: 'sup01',
      fullName: 'Supervisor User',
      role: 'supervisor',
    })

    vi.mocked(auth.exportTransactionsToExcel).mockResolvedValue({
      blob: new Blob(['same-day-excel']),
      filename: 'WPK_MMS_Transaction_Report_2026-08-15_to_2026-08-15.xlsx',
    })

    render(<ReportsPage />)

    const dateSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(dateSelect, { target: { value: 'custom' } })

    const startInput = await screen.findByLabelText(/วันที่เริ่มต้น/i)
    const endInput = await screen.findByLabelText(/วันที่สิ้นสุด/i)

    fireEvent.change(startInput, { target: { value: '2026-08-15' } })
    fireEvent.change(endInput, { target: { value: '2026-08-15' } })

    const exportBtn = screen.getByRole('button', { name: /ส่งออก Excel/i })
    fireEvent.click(exportBtn)

    await waitFor(() => {
      expect(auth.exportTransactionsToExcel).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2026-08-15',
          endDate: '2026-08-15',
        })
      )
      expect(auth.downloadBlob).toHaveBeenCalled()
    })
  })

  it('17. Staff View: Displays "รับเข้า" and "ยืนยันแล้ว" as plain green text without highlight badges', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 3,
      username: 'staff01',
      fullName: 'Warehouse Staff',
      role: 'warehouse_staff',
    })

    render(<ReportsPage />)

    await waitFor(() => {
      const receiveElements = screen.getAllByText('รับเข้า')
      expect(receiveElements.length).toBeGreaterThan(0)
      const staffReceiveSpan = receiveElements.find(el => el.classList.contains('text-emerald-600') && !el.classList.contains('bg-emerald-50'))
      expect(staffReceiveSpan).toBeDefined()

      const confirmedElements = screen.getAllByText('ยืนยันแล้ว')
      expect(confirmedElements.length).toBeGreaterThan(0)
      const staffConfirmedSpan = confirmedElements.find(el => el.classList.contains('text-emerald-600') && !el.classList.contains('bg-emerald-50'))
      expect(staffConfirmedSpan).toBeDefined()
    })
  })

  it('18. Supervisor View: Displays "รับเข้า" and "ยืนยันแล้ว" with green text styling', async () => {
    vi.mocked(auth.getUser).mockReturnValue({
      id: 2,
      username: 'sup01',
      fullName: 'Supervisor User',
      role: 'supervisor',
    })

    render(<ReportsPage />)

    await waitFor(() => {
      const receiveBadges = screen.getAllByText('รับเข้า')
      const badgeContainer = receiveBadges.find(el => el.closest('.text-emerald-600'))
      expect(badgeContainer).toBeDefined()

      const confirmedBadges = screen.getAllByText('ยืนยันแล้ว')
      const confirmedContainer = confirmedBadges.find(el => el.closest('.text-emerald-600'))
      expect(confirmedContainer).toBeDefined()
    })
  })
})

