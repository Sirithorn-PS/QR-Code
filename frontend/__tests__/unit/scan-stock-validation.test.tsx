import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScanPage from '@/app/scan/page'
import * as auth from '@/lib/auth'

// Mock QRScanner to avoid html5-qrcode camera/DOM API requirements in JSDOM
vi.mock('@/components/QRScanner', () => ({
  default: () => <div data-testid="mock-qr-scanner">Mock QR Scanner</div>,
}))

// Mock @/lib/auth methods used by ScanPage
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    fetchProduct: vi.fn(),
    fetchProductBom: vi.fn(),
    createTransaction: vi.fn(),
  }
})

describe('Scan Page — Inline Stock Validation (STEP 4.19)', () => {
  const mockPackagingProduct: auth.Product = {
    id: 10,
    itemCode: 'PK-BOX-001',
    productId: 'PROD-10',
    name: 'กล่องบรรจุภัณฑ์ 1 ลิตร WPK',
    unit: 'PCS',
    warehouse: 'WPK',
    location: 'A-01',
    quantity: 50, // Current stock is 50 PCS
    itemType: 'Packaging',
    status: 'active',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('user', JSON.stringify({ username: 'staff01', fullName: 'Staff One', role: 'warehouse_staff' }))
    vi.mocked(auth.fetchProduct).mockResolvedValue(mockPackagingProduct)
    vi.mocked(auth.fetchProductBom).mockResolvedValue([])
    vi.mocked(auth.createTransaction).mockResolvedValue({
      id: 999,
      productId: 10,
      type: 'issue',
      quantity: 1,
      status: 'pending',
      createdAt: new Date().toISOString(),
    } as unknown as auth.StockTransaction)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('Test 1: Issue mode + Quantity < Stock (40 < 50) -> PASS, no warning, submit enabled', async () => {
    window.history.replaceState({}, '', '/scan?mode=issue&code=PK-BOX-001')
    render(<ScanPage />)

    // Wait for product to load in bottom sheet
    await waitFor(() => {
      expect(screen.getByText('กล่องบรรจุภัณฑ์ 1 ลิตร WPK')).toBeInTheDocument()
    })

    const qtyInput = screen.getByLabelText('จำนวน') as HTMLInputElement
    fireEvent.change(qtyInput, { target: { value: '40' } })

    // Warning should NOT be present
    expect(screen.queryByText(/จำนวนเบิกเกินสต็อกคงเหลือ/i)).toBeNull()

    const submitBtn = screen.getByRole('button', { name: /เบิกออกวัตถุดิบ/i })
    expect(submitBtn).not.toBeDisabled()

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(auth.createTransaction).toHaveBeenCalledWith({
        itemCode: 'PK-BOX-001',
        type: 'issue',
        quantity: 40,
        note: '',
      })
    })
  })

  it('Test 2: Issue mode + Quantity = Stock (50 == 50) -> PASS, exact match allowed, submit enabled', async () => {
    window.history.replaceState({}, '', '/scan?mode=issue&code=PK-BOX-001')
    render(<ScanPage />)

    await waitFor(() => {
      expect(screen.getByText('กล่องบรรจุภัณฑ์ 1 ลิตร WPK')).toBeInTheDocument()
    })

    const qtyInput = screen.getByLabelText('จำนวน') as HTMLInputElement
    fireEvent.change(qtyInput, { target: { value: '50' } })

    expect(screen.queryByText(/จำนวนเบิกเกินสต็อกคงเหลือ/i)).toBeNull()

    const submitBtn = screen.getByRole('button', { name: /เบิกออกวัตถุดิบ/i })
    expect(submitBtn).not.toBeDisabled()

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(auth.createTransaction).toHaveBeenCalledWith({
        itemCode: 'PK-BOX-001',
        type: 'issue',
        quantity: 50,
        note: '',
      })
    })
  })

  it('Test 3: Issue mode + Quantity > Stock (51 > 50) -> FAIL, warning shown, submit disabled, no API call', async () => {
    window.history.replaceState({}, '', '/scan?mode=issue&code=PK-BOX-001')
    render(<ScanPage />)

    await waitFor(() => {
      expect(screen.getByText('กล่องบรรจุภัณฑ์ 1 ลิตร WPK')).toBeInTheDocument()
    })

    const qtyInput = screen.getByLabelText('จำนวน') as HTMLInputElement
    fireEvent.change(qtyInput, { target: { value: '51' } })

    // Inline Warning and details must appear
    expect(screen.getByText(/จำนวนเบิกเกินสต็อกคงเหลือ/i)).toBeInTheDocument()
    expect(screen.getByText(/สต็อกคงเหลือ:/i)).toBeInTheDocument()
    expect(screen.getByText(/50 PCS/i)).toBeInTheDocument()
    expect(screen.getByText(/จำนวนที่เบิก:/i)).toBeInTheDocument()
    expect(screen.getByText(/51 PCS/i)).toBeInTheDocument()
    expect(screen.getByText(/กรุณาระบุจำนวนไม่เกินสต็อกคงเหลือ/i)).toBeInTheDocument()

    // Submit button must be disabled
    const submitBtn = screen.getByRole('button', { name: /เบิกออกวัตถุดิบ/i })
    expect(submitBtn).toBeDisabled()

    // Clicking submit button must NOT trigger API
    fireEvent.click(submitBtn)
    expect(auth.createTransaction).not.toHaveBeenCalled()
  })

  it('Test 4: Receive mode + Quantity > Stock (100 > 50) -> PASS, no warning, submit allowed', async () => {
    window.history.replaceState({}, '', '/scan?mode=receive&code=PK-BOX-001')
    render(<ScanPage />)

    await waitFor(() => {
      expect(screen.getByText('กล่องบรรจุภัณฑ์ 1 ลิตร WPK')).toBeInTheDocument()
    })

    const qtyInput = screen.getByLabelText('จำนวน') as HTMLInputElement
    fireEvent.change(qtyInput, { target: { value: '100' } })

    // Warning MUST NOT be shown for receive
    expect(screen.queryByText(/จำนวนเบิกเกินสต็อกคงเหลือ/i)).toBeNull()

    const submitBtn = screen.getByRole('button', { name: /รับเข้าคลังวัตถุดิบ/i })
    expect(submitBtn).not.toBeDisabled()

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(auth.createTransaction).toHaveBeenCalledWith({
        itemCode: 'PK-BOX-001',
        type: 'receive',
        quantity: 100,
        note: '',
      })
    })
  })

  it('Test 5: Quantity = 0 -> Uses existing validation, blocks submit with error message', async () => {
    window.history.replaceState({}, '', '/scan?mode=issue&code=PK-BOX-001')
    render(<ScanPage />)

    await waitFor(() => {
      expect(screen.getByText('กล่องบรรจุภัณฑ์ 1 ลิตร WPK')).toBeInTheDocument()
    })

    const qtyInput = screen.getByLabelText('จำนวน') as HTMLInputElement
    fireEvent.change(qtyInput, { target: { value: '0' } })

    // Not stock exceeded warning
    expect(screen.queryByText(/จำนวนเบิกเกินสต็อกคงเหลือ/i)).toBeNull()

    const submitBtn = screen.getByRole('button', { name: /เบิกออกวัตถุดิบ/i })
    fireEvent.click(submitBtn)

    // Existing validation message is shown
    await waitFor(() => {
      expect(screen.getByText(/กรุณาระบุจำนวนสินค้าให้ถูกต้อง \(ต้องมากกว่า 0\)/i)).toBeInTheDocument()
    })
    expect(auth.createTransaction).not.toHaveBeenCalled()
  })

  it('Test 6: Quantity empty -> Uses existing validation, blocks submit with error message', async () => {
    window.history.replaceState({}, '', '/scan?mode=issue&code=PK-BOX-001')
    render(<ScanPage />)

    await waitFor(() => {
      expect(screen.getByText('กล่องบรรจุภัณฑ์ 1 ลิตร WPK')).toBeInTheDocument()
    })

    const qtyInput = screen.getByLabelText('จำนวน') as HTMLInputElement
    fireEvent.change(qtyInput, { target: { value: '' } })

    // Not stock exceeded warning
    expect(screen.queryByText(/จำนวนเบิกเกินสต็อกคงเหลือ/i)).toBeNull()

    const submitBtn = screen.getByRole('button', { name: /เบิกออกวัตถุดิบ/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/กรุณาระบุจำนวนสินค้าให้ถูกต้อง \(ต้องมากกว่า 0\)/i)).toBeInTheDocument()
    })
    expect(auth.createTransaction).not.toHaveBeenCalled()
  })

  it('Test 7: Fix Quantity from > Stock (60) to valid (25) -> Warning disappears and submit re-enabled', async () => {
    window.history.replaceState({}, '', '/scan?mode=issue&code=PK-BOX-001')
    render(<ScanPage />)

    await waitFor(() => {
      expect(screen.getByText('กล่องบรรจุภัณฑ์ 1 ลิตร WPK')).toBeInTheDocument()
    })

    const qtyInput = screen.getByLabelText('จำนวน') as HTMLInputElement

    // Step 1: Input 60 (> 50)
    fireEvent.change(qtyInput, { target: { value: '60' } })
    expect(screen.getByText(/จำนวนเบิกเกินสต็อกคงเหลือ/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /เบิกออกวัตถุดิบ/i })
    expect(submitBtn).toBeDisabled()

    // Step 2: Fix to 25 (<= 50)
    fireEvent.change(qtyInput, { target: { value: '25' } })

    // Warning disappears immediately
    expect(screen.queryByText(/จำนวนเบิกเกินสต็อกคงเหลือ/i)).toBeNull()
    expect(submitBtn).not.toBeDisabled()

    // Can submit now
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(auth.createTransaction).toHaveBeenCalledWith({
        itemCode: 'PK-BOX-001',
        type: 'issue',
        quantity: 25,
        note: '',
      })
    })
  })
})
