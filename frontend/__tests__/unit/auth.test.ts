import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setAuthData, getToken, logout, login, fetchTransactions, exportTransactionsToExcel, downloadBlob, API_BASE_URL } from '@/lib/auth'

describe('Auth Service (Unit Tests)', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset fetch mock
    global.fetch = vi.fn()
  })

  it('should save and retrieve token correctly', () => {
    setAuthData('fake-jwt-token', { id: 1, username: 'test', fullName: 'Test', role: 'admin' })
    expect(getToken()).toBe('fake-jwt-token')
  })

  it('should clear token and user on logout', () => {
    localStorage.setItem('token', 'fake-jwt-token')
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'admin' }))
    
    logout()
    
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('should successfully login and return auth response', async () => {
    const mockResponse = {
      token: 'test-token',
      user: { id: 1, username: 'testuser', fullName: 'Test', role: 'admin' }
    }
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const result = await login({ username: 'testuser', password: 'password123' })
    
    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/login`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ username: 'testuser', password: 'password123' })
    }))
    expect(result).toEqual(mockResponse)
  })

  it('should throw an error on login failure', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' })
    } as Response)

    await expect(login({ username: 'wrong', password: 'wrong' })).rejects.toThrow('Invalid credentials')
  })

  it('should fetch transactions and bypass cache', async () => {
    const mockTransactions = [{ id: 1, type: 'receive', quantity: 10 }]
    
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTransactions
    } as Response)

    const result = await fetchTransactions('pending')
    
    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/transactions?status=pending`, expect.objectContaining({
      cache: 'no-store'
    }))
    expect(result).toEqual(mockTransactions)
  })

  describe('exportTransactionsToExcel', () => {
    it('should call /reports/export-excel with authorization and parse blob and filename', async () => {
      localStorage.setItem('token', 'supervisor-token-123')
      const mockBlob = new Blob(['mock excel content'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
        headers: new Headers({
          'Content-Disposition': 'attachment; filename="WPK_MMS_Transaction_Report_2026-08-01_to_2026-08-31.xlsx"'
        })
      } as Response)

      const result = await exportTransactionsToExcel({
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        status: 'confirmed',
        search: '7530010083',
        category: 'normal'
      })

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/reports/export-excel?startDate=2026-08-01&endDate=2026-08-31&status=confirmed&search=7530010083&category=normal`,
        expect.objectContaining({
          method: 'GET',
          cache: 'no-store',
          headers: expect.objectContaining({
            Authorization: 'Bearer supervisor-token-123'
          })
        })
      )
      expect(result.blob).toBe(mockBlob)
      expect(result.filename).toBe('WPK_MMS_Transaction_Report_2026-08-01_to_2026-08-31.xlsx')
    })

    it('should omit empty parameters and category=all from query string', async () => {
      const mockBlob = new Blob(['test'])
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
        headers: new Headers()
      } as Response)

      const result = await exportTransactionsToExcel({
        startDate: '',
        endDate: '',
        status: '',
        search: '',
        category: 'all'
      })

      expect(global.fetch).toHaveBeenCalledWith(
        `${API_BASE_URL}/reports/export-excel`,
        expect.anything()
      )
      expect(result.filename).toBe('WPK_MMS_Transaction_Report.xlsx')
    })

    it('should throw error when backend returns 400 Bad Request', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'สถานะไม่ถูกต้อง' })
      } as Response)

      await expect(exportTransactionsToExcel({ status: 'invalid' })).rejects.toThrow('สถานะไม่ถูกต้อง')
    })

    it('should throw error when backend returns 403 Forbidden', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden: Insufficient permissions' })
      } as Response)

      await expect(exportTransactionsToExcel()).rejects.toThrow('Forbidden: Insufficient permissions')
    })

    it('should throw error when backend returns 404 No Data', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'ไม่พบข้อมูลสำหรับส่งออกตามเงื่อนไขที่ระบุ' })
      } as Response)

      await expect(exportTransactionsToExcel({ search: 'UNKNOWN' })).rejects.toThrow(
        'ไม่พบข้อมูลสำหรับส่งออกตามเงื่อนไขที่ระบุ'
      )
    })

    it('should throw error when backend returns 500 Internal Server Error', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'ไม่สามารถส่งออกรายงาน Excel ได้' })
      } as Response)

      await expect(exportTransactionsToExcel()).rejects.toThrow('ไม่สามารถส่งออกรายงาน Excel ได้')
    })

    it('should throw descriptive connection error on network failure', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      await expect(exportTransactionsToExcel()).rejects.toThrow('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Backend ได้')
    })
  })

  describe('downloadBlob', () => {
    it('should trigger browser anchor download and revoke object URL', () => {
      const mockBlob = new Blob(['sample data'])
      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost:3000/mock-id')
      const revokeObjectURLMock = vi.fn()
      global.URL.createObjectURL = createObjectURLMock
      global.URL.revokeObjectURL = revokeObjectURLMock

      const appendChildSpy = vi.spyOn(document.body, 'appendChild')
      const removeChildSpy = vi.spyOn(document.body, 'removeChild')

      downloadBlob(mockBlob, 'test_export.xlsx')

      expect(createObjectURLMock).toHaveBeenCalledWith(mockBlob)
      expect(appendChildSpy).toHaveBeenCalled()
      expect(removeChildSpy).toHaveBeenCalled()
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost:3000/mock-id')
    })
  })
})
