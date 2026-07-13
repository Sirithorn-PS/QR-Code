import 'dotenv/config'
import express, { NextFunction, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = express()

// Global Singleton PrismaClient to prevent Supabase connection pool exhaustion during dev / hot reloads
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000'
const isProduction = process.env.NODE_ENV === 'production'
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET && isProduction) {
  throw new Error('JWT_SECRET is required in production')
}

const jwtSecret = JWT_SECRET || 'development-only-secret'

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigin)
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204)
  }
  return next()
})

app.use(express.json())

interface AuthenticatedUser {
  id: number
  username: string
  role: string
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

interface RegisterBody {
  username: string
  password: string
  fullName: string
}

interface LoginBody {
  username: string
  password: string
}

interface TransactionBody {
  itemCode: string
  type: 'receive' | 'issue'
  quantity: number
  note?: string
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function signToken(user: { id: number; username: string; role: string }) {
  return jwt.sign({ userId: user.id, username: user.username, role: user.role }, jwtSecret, {
    expiresIn: '24h',
  })
}

function toPublicUser(user: { id: number; username: string; fullName: string; role: string }) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  }
}

async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token && token !== 'null' && token !== 'undefined') {
    try {
      const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload
      req.user = {
        id: Number(payload.userId),
        username: String(payload.username),
        role: String(payload.role),
      }
      return next()
    } catch {
      // If token verification fails, fall through to default user
    }
  }

  // Fallback: assign default active Admin user without blocking
  try {
    const firstAdmin = await prisma.user.findFirst({
      where: { role: 'admin' },
      orderBy: { id: 'asc' },
    })
    if (firstAdmin) {
      req.user = {
        id: firstAdmin.id,
        username: firstAdmin.username,
        role: firstAdmin.role,
      }
    } else {
      req.user = { id: 6, username: 'admin', role: 'admin' }
    }
  } catch {
    req.user = { id: 6, username: 'admin', role: 'admin' }
  }

  return next()
}

function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // ไม่จำกัดสิทธิ์การเข้าถึงตามความต้องการของผู้ใช้งาน
    return next()
  }
}

function productSnapshot(product: {
  id: number
  itemCode: string
  productId: string | null
  description: string
  unit: string
  warehouse: string
  location: string
  quantity: number
  itemType?: string
  parentItemCodes?: string[]
}) {
  return {
    id: product.id,
    itemCode: product.itemCode,
    productId: product.productId,
    name: product.description,
    unit: product.unit,
    warehouse: product.warehouse,
    location: product.location,
    quantity: product.quantity,
    itemType: product.itemType || 'FG',
    parentItemCodes: product.parentItemCodes || (product.itemType === 'FG' ? [product.itemCode] : [])
  }
}

const fallbackUsersCache = new Map<string, any>()

app.post('/auth/register', async (req: Request<{}, {}, RegisterBody>, res: Response) => {
  try {
    const username = normalizeText(req.body.username)
    const password = normalizeText(req.body.password)
    const fullName = normalizeText(req.body.fullName)

    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    if (fallbackUsersCache.has(username) || username === 'admin' || username === 'staff') {
      return res.status(409).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้วในระบบ' })
    }

    try {
      const existingUser = await prisma.user.findUnique({ where: { username } })
      if (existingUser) {
        return res.status(409).json({ error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้วในระบบ' })
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          fullName,
          role: 'warehouse_staff',
        },
      })

      return res.status(201).json({
        token: signToken(user),
        user: toPublicUser(user),
      })
    } catch (dbError) {
      console.warn('Database unreachable during registration, using memory cache mode for:', username)
      const fallbackUser = { id: Math.floor(Math.random() * 1000) + 10, username, password, fullName, role: 'warehouse_staff', createdAt: new Date() }
      fallbackUsersCache.set(username, fallbackUser)
      return res.status(201).json({
        token: signToken(fallbackUser),
        user: toPublicUser(fallbackUser),
      })
    }
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/auth/login', async (req: Request<{}, {}, LoginBody>, res: Response) => {
  try {
    const username = normalizeText(req.body.username)
    const password = normalizeText(req.body.password)

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' })
    }

    // Fast-path for default Master Data users
    if (username === 'admin' && password === 'admin123') {
      const defaultAdmin = { id: 6, username: 'admin', password: '', fullName: 'ผู้ดูแลระบบคลังสินค้า (Admin)', role: 'admin', createdAt: new Date() }
      return res.json({
        token: signToken(defaultAdmin),
        user: toPublicUser(defaultAdmin),
      })
    }
    if (username === 'staff' && password === 'staff123') {
      const defaultStaff = { id: 7, username: 'staff', password: '', fullName: 'พนักงานคลังสินค้า (Staff)', role: 'warehouse_staff', createdAt: new Date() }
      return res.json({
        token: signToken(defaultStaff),
        user: toPublicUser(defaultStaff),
      })
    }

    // Check memory cache from recent registration first
    if (fallbackUsersCache.has(username)) {
      const cachedUser = fallbackUsersCache.get(username)
      if (cachedUser.password !== password) {
        return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' })
      }
      return res.json({
        token: signToken(cachedUser),
        user: toPublicUser(cachedUser),
      })
    }

    // Try database lookup for custom registered users
    let user = null
    try {
      user = await prisma.user.findUnique({ where: { username } })
    } catch (dbError) {
      console.warn('Database unreachable during login for:', username)
      // หากเชื่อมต่อฐานข้อมูลไม่ได้ และไม่ได้ลงทะเบียนไว้ในระบบ ให้แจ้งเตือนต้องลงทะเบียนก่อน
      return res.status(401).json({ error: 'ไม่พบบัญชีผู้ใช้ในระบบ กรุณาลงทะเบียนก่อนเข้าใช้งาน' })
    }

    if (!user) {
      return res.status(401).json({ error: 'ไม่พบบัญชีผู้ใช้ในระบบ กรุณาลงทะเบียนก่อนเข้าใช้งาน' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' })
    }

    return res.json({
      token: signToken(user),
      user: toPublicUser(user),
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.get('/users', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้ชั่วคราว' })
  }
})

app.get('/products', authenticate, async (req, res) => {
  try {
    const search = normalizeText(req.query.search)
    const itemType = normalizeText(req.query.itemType)

    const whereClause: Record<string, unknown> = {}
    if (search) {
      whereClause.OR = [
        { itemCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (itemType && itemType !== 'ALL') {
      whereClause.itemType = itemType
    }

    const [products, boms] = await Promise.all([
      prisma.product.findMany({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        take: 500,
      }),
      prisma.billOfMaterial.findMany({
        select: { parentItemCode: true, componentItemCode: true }
      })
    ])

    const parentMap = new Map<string, Set<string>>()
    const bomItemCodes = new Set<string>()
    boms.forEach(b => {
      if (b.parentItemCode) bomItemCodes.add(b.parentItemCode.trim())
      if (b.componentItemCode) bomItemCodes.add(b.componentItemCode.trim())
      if (!parentMap.has(b.componentItemCode)) parentMap.set(b.componentItemCode, new Set())
      parentMap.get(b.componentItemCode)!.add(b.parentItemCode)
    })

    // กรองสินค้าให้เอาเฉพาะรหัสที่มีอยู่ในตาราง BillOfMaterial เท่านั้น
    const validProducts = products.filter(p => bomItemCodes.has(p.itemCode.trim()))

    // Sort: FG (👑 สินค้าสำเร็จรูป / รหัสหลัก Item 1) comes first, then Bulk, Packaging, Raw Material
    const typePriority: Record<string, number> = {
      'FG': 1,
      'Bulk': 2,
      'Packaging': 3,
      'Raw Material': 4
    }

    validProducts.sort((a, b) => {
      const pA = typePriority[a.itemType || 'FG'] || 99
      const pB = typePriority[b.itemType || 'FG'] || 99
      if (pA !== pB) return pA - pB
      return a.itemCode.localeCompare(b.itemCode)
    })

    return res.json(validProducts.map(p => {
      const parents = parentMap.get(p.itemCode)
      return productSnapshot({
        ...p,
        parentItemCodes: parents ? Array.from(parents) : (p.itemType === 'FG' ? [p.itemCode] : [])
      })
    }))
  } catch (error) {
    console.error('Error fetching products:', error)
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลสต็อกสินค้าได้ชั่วคราว กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง' })
  }
})

app.get('/products/:itemCode/bom', authenticate, async (req, res) => {
  try {
    const parentItemCode = req.params.itemCode
    const boms = await prisma.billOfMaterial.findMany({
      where: { parentItemCode },
      orderBy: [
        { depth: 'asc' },
        { componentItemCode: 'asc' }
      ]
    })
    return res.json(boms)
  } catch (err) {
    console.error('Error fetching BOM:', err)
    return res.status(500).json({ error: 'ไม่สามารถดึงสูตร BOM ได้' })
  }
})

app.get('/boms', authenticate, async (req, res) => {
  try {
    const boms = await prisma.billOfMaterial.findMany({
      orderBy: [
        { parentItemCode: 'asc' },
        { depth: 'asc' }
      ]
    })
    return res.json(boms)
  } catch (err) {
    console.error('Error fetching BOMs:', err)
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูล BOM ทั้งหมดได้' })
  }
})

app.get('/products/:itemCode', authenticate, async (req, res) => {
  try {
    const itemCode = req.params.itemCode
    const [product, bomExists] = await Promise.all([
      prisma.product.findUnique({
        where: { itemCode },
      }),
      prisma.billOfMaterial.findFirst({
        where: {
          OR: [
            { parentItemCode: itemCode },
            { componentItemCode: itemCode }
          ]
        }
      })
    ])

    if (!product || !bomExists) {
      return res.status(404).json({ error: 'ไม่พบสินค้ารหัสนี้ในระบบ (หรือไม่ได้อยู่ในตารางสูตร BOM)' })
    }

    return res.json(productSnapshot(product))
  } catch (error) {
    console.error('Error fetching single product:', error)
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลสินค้ารายการนี้ได้ชั่วคราว' })
  }
})

app.post('/products', authenticate, async (req, res) => {
  try {
    const { itemCode, description, unit, warehouse, location, quantity } = req.body

    if (!itemCode || !description || !unit || !warehouse || location === undefined || quantity === undefined) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วน' })
    }

    const existingProduct = await prisma.product.findUnique({
      where: { itemCode: String(itemCode) },
    })

    if (existingProduct) {
      return res.status(409).json({ error: 'รหัสสินค้า (Item Code) นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น' })
    }

    const newProduct = await prisma.product.create({
      data: {
        itemCode: String(itemCode),
        description: String(description),
        unit: String(unit),
        warehouse: String(warehouse),
        location: String(location),
        quantity: Number(quantity),
        itemType: req.body.itemType ? String(req.body.itemType) : 'FG',
      },
    })

    return res.status(201).json(productSnapshot(newProduct))
  } catch (error) {
    console.error('Error creating product:', error)
    return res.status(500).json({ error: 'เพิ่มรายการสินค้าไม่สำเร็จ เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' })
  }
})

app.patch('/products/:id/quantity', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id)
    const quantity = Number(req.body.quantity)

    if (isNaN(id) || isNaN(quantity) || !Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ error: 'จำนวนสต็อกต้องเป็นตัวเลขจำนวนเต็มที่ไม่ติดลบ' })
    }

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) {
      return res.status(404).json({ error: 'ไม่พบสินค้ารายการนี้ในระบบ' })
    }

    if (product.quantity === quantity) {
      return res.json(productSnapshot(product))
    }

    const diff = quantity - product.quantity
    const type = diff > 0 ? 'receive' : 'issue'
    const absDiff = Math.abs(diff)

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id },
        data: { quantity },
      })

      await tx.transaction.create({
        data: {
          productId: id,
          type,
          quantity: absDiff,
          status: 'confirmed',
          note: `ปรับปรุงสต็อก (เดิม ${product.quantity.toLocaleString()} -> ใหม่ ${quantity.toLocaleString()})`,
          itemSnapshot: productSnapshot(p),
          createdById: req.user!.id,
          approvedById: req.user!.id,
          confirmedAt: new Date(),
        },
      })

      return p
    })

    return res.json(productSnapshot(updatedProduct))
  } catch (error) {
    console.error('Error updating product quantity:', error)
    return res.status(500).json({ error: 'อัปเดตจำนวนสต็อกไม่สำเร็จ' })
  }
})

app.delete('/products/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' })
    }

    // Delete related transactions first (due to no cascade delete in Prisma schema)
    await prisma.transaction.deleteMany({
      where: { productId: id },
    })

    await prisma.product.delete({
      where: { id },
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return res.status(500).json({ error: 'Failed to delete product' })
  }
})

app.get('/transactions', authenticate, async (req, res) => {
  try {
    const status = normalizeText(req.query.status)
    const startDate = normalizeText(req.query.startDate)
    const endDate = normalizeText(req.query.endDate)
    
    const whereClause: {
      status?: string
      createdAt?: { gte: Date; lte: Date }
    } = {}

    if (status) {
      whereClause.status = status
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      
      whereClause.createdAt = {
        gte: start,
        lte: end,
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        product: true,
        createdBy: {
          select: { id: true, username: true, fullName: true, role: true },
        },
        approvedBy: {
          select: { id: true, username: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return res.json(transactions)
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return res.status(500).json({ error: 'ไม่สามารถดึงประวัติการทำรายการได้ชั่วคราว' })
  }
})

app.post('/transactions', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as TransactionBody
    const itemCode = normalizeText(body.itemCode)
    const type = body.type
    const quantity = Number(body.quantity)

    if (!itemCode || !['receive', 'issue'].includes(type) || !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid transaction data' })
    }

    const product = await prisma.product.findUnique({ where: { itemCode } })
    if (!product) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const transaction = await prisma.transaction.create({
      data: {
        productId: product.id,
        type,
        quantity,
        status: 'pending',
        note: normalizeText(body.note) || null,
        itemSnapshot: productSnapshot(product),
        createdById: req.user!.id,
      },
      include: {
        product: true,
        createdBy: {
          select: { id: true, username: true, fullName: true, role: true },
        },
      },
    })

    return res.status(201).json(transaction)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

app.post(
  '/transactions/:id/confirm',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id)
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid transaction id' })
      }

      const transaction = await prisma.transaction.findUnique({
        where: { id },
        include: { product: true },
      })

      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' })
      }

      if (transaction.status !== 'pending') {
        return res.status(409).json({ error: 'Transaction is not pending' })
      }

      const nextQuantity =
        transaction.type === 'receive'
          ? transaction.product.quantity + transaction.quantity
          : transaction.product.quantity - transaction.quantity

      if (nextQuantity < 0) {
        return res.status(409).json({ error: 'Insufficient stock' })
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: transaction.productId },
          data: { quantity: nextQuantity },
        })

        return tx.transaction.update({
          where: { id },
          data: {
            status: 'confirmed',
            approvedById: req.user!.id,
            confirmedAt: new Date(),
          },
          include: {
            product: true,
            createdBy: {
              select: { id: true, username: true, fullName: true, role: true },
            },
            approvedBy: {
              select: { id: true, username: true, fullName: true, role: true },
            },
          },
        })
      })

      return res.json(result)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  },
)

app.post(
  '/transactions/:id/reject',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = Number(req.params.id)
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid transaction id' })
      }

      const transaction = await prisma.transaction.findUnique({ where: { id } })
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' })
      }

      if (transaction.status !== 'pending') {
        return res.status(409).json({ error: 'Transaction is not pending' })
      }

      const result = await prisma.transaction.update({
        where: { id },
        data: {
          status: 'rejected',
          note: normalizeText(req.body?.note) || transaction.note,
          approvedById: req.user!.id,
          rejectedAt: new Date(),
        },
        include: {
          product: true,
          createdBy: {
            select: { id: true, username: true, fullName: true, role: true },
          },
          approvedBy: {
            select: { id: true, username: true, fullName: true, role: true },
          },
        },
      })

      return res.json(result)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  },
)

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled API Error:', err)
  if (res.headersSent) {
    return next(err)
  }
  return res.status(500).json({ error: 'ไม่สามารถเชื่อมต่อฐานข้อมูลหรือเกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง' })
})

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Promise Rejection (Preventing Server Crash):', reason)
})

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception (Preventing Server Crash):', error)
})

const port = process.env.PORT || 4000
const server = app.listen(port, () => {
  console.log(`Backend listening on ${port}`)
})

// Graceful shutdown: Disconnect Prisma completely when restarting or exiting to release Supabase connection pool
const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Gracefully shutting down backend and releasing database connections...`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
