import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setAuthData, getToken, logout, login, fetchTransactions, API_BASE_URL } from '@/lib/auth'

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
})
