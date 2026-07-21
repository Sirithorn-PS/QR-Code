import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../src/index' // Using the exported app

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
})
