import 'dotenv/config'
import express, { NextFunction, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const app = express()
const prisma = new PrismaClient()

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

function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload
    req.user = {
      id: Number(payload.userId),
      username: String(payload.username),
      role: String(payload.role),
    }
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
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
  }
}

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

    const existingUser = await prisma.user.findUnique({ where: { username } })
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' })
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

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
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
})

app.get('/products', authenticate, async (req, res) => {
  const search = normalizeText(req.query.search)
  const products = await prisma.product.findMany({
    where: search
      ? {
          OR: [
            { itemCode: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { itemCode: 'asc' },
    take: 200,
  })
  return res.json(products.map(productSnapshot))
})

app.get('/products/:itemCode', authenticate, async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { itemCode: req.params.itemCode },
  })

  if (!product) {
    return res.status(404).json({ error: 'ไม่พบสินค้ารหัสนี้ในระบบ' })
  }

  return res.json(productSnapshot(product))
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
      },
    })

    return res.status(201).json(productSnapshot(newProduct))
  } catch (error) {
    console.error('Error creating product:', error)
    return res.status(500).json({ error: 'เพิ่มรายการสินค้าไม่สำเร็จ เกิดข้อผิดพลาดที่เซิร์ฟเวอร์' })
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
  const status = normalizeText(req.query.status)
  const transactions = await prisma.transaction.findMany({
    where: status ? { status } : undefined,
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

const port = process.env.PORT || 4000
app.listen(port, () => {
  console.log(`Backend listening on ${port}`)
})
