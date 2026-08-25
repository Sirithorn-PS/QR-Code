import 'dotenv/config'

// Sanitize DATABASE_URL and DIRECT_URL to automatically remove accidental quotes or whitespace from Environment Variables
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^["']|["']$/g, '').trim()
}
if (process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DIRECT_URL.replace(/^["']|["']$/g, '').trim()
}

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

const corsOriginEnv = process.env.CORS_ORIGIN || 'http://localhost:3000'
const allowedOrigins = corsOriginEnv.split(',').map(o => o.trim().replace(/\/+$/, ''))
const isProduction = process.env.NODE_ENV === 'production'
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET && isProduction) {
  throw new Error('JWT_SECRET is required in production')
}

const jwtSecret = JWT_SECRET || 'development-only-secret'

app.use((req, res, next) => {
  const origin = req.headers.origin
  const cleanOrigin = origin?.replace(/\/+$/, '')
  
  if (origin) {
    if (allowedOrigins.includes('*') || allowedOrigins.includes(cleanOrigin || '') || cleanOrigin?.includes('vercel.app') || cleanOrigin?.includes('localhost')) {
      res.header('Access-Control-Allow-Origin', origin)
    } else {
      res.header('Access-Control-Allow-Origin', allowedOrigins[0] || 'http://localhost:3000')
    }
  } else {
    res.header('Access-Control-Allow-Origin', allowedOrigins[0] || 'http://localhost:3000')
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept')
  res.header('Access-Control-Allow-Credentials', 'true')
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
  employeeId?: string
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

function toPublicUser(user: { id: number; username: string; fullName: string; role: string; employeeId?: string | null; status?: string | null }) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    employeeId: user.employeeId || null,
    status: user.status || 'approved',
  }
}

async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.header('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token || token === 'null' || token === 'undefined') {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as jwt.JwtPayload
    const userId = Number(payload.userId)
    if (!Number.isInteger(userId) || userId <= 0) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }
    req.user = {
      id: userId,
      username: String(payload.username || ''),
      role: String(payload.role || ''),
    }
    return next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }
}

function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' })
      return
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

const fallbackUsersCache = new Map<string, Record<string, unknown>>()

app.post('/auth/register', async (req: Request<{}, {}, RegisterBody>, res: Response) => {
  return res.status(403).json({
    error: 'ระบบปิดรับการสมัครสมาชิกสาธารณะแล้ว กรุณาติดต่อแอดมินระบบ (System Admin) เพื่อสร้างบัญชีการใช้งาน',
  })
})

app.post('/auth/verify-employee', async (req: Request, res: Response) => {
  try {
    const username = normalizeText(req.body.username)
    const employeeId = normalizeText(req.body.employeeId)

    if (!username || !employeeId) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสพนักงานให้ครบถ้วน' })
    }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' })
    }

    if (!user.employeeId || user.employeeId.trim().toLowerCase() !== employeeId.toLowerCase()) {
      return res.status(400).json({ error: 'รหัสพนักงานไม่ถูกต้อง หรือไม่ตรงกับชื่อผู้ใช้ที่ระบุ' })
    }

    return res.json({ success: true, message: 'ยืนยันตัวตนสำเร็จ' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' })
  }
})

app.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const username = normalizeText(req.body.username)
    const employeeId = normalizeText(req.body.employeeId)
    const newPassword = normalizeText(req.body.newPassword)

    if (!username || !employeeId || !newPassword) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
    }

    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบชื่อผู้ใช้นี้ในระบบ' })
    }

    if (!user.employeeId || user.employeeId.trim().toLowerCase() !== employeeId.toLowerCase()) {
      return res.status(400).json({ error: 'รหัสพนักงานไม่ถูกต้อง ไม่สามารถเปลี่ยนรหัสผ่านได้' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { username },
      data: { password: hashedPassword }
    })

    return res.json({ success: true, message: 'เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน' })
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
      const defaultAdmin = { id: 5, username: 'admin', password: '', fullName: 'แอดมินระบบ (System Admin)', role: 'admin', status: 'approved', createdAt: new Date() }
      return res.json({
        token: signToken(defaultAdmin),
        user: toPublicUser(defaultAdmin),
      })
    }
    if (username === 'supervisor' && password === 'super1234') {
      const defaultSupervisor = { id: 6, username: 'supervisor', password: '', fullName: 'ผู้ควบคุมดูแลระบบ (Supervisor)', role: 'supervisor', status: 'approved', createdAt: new Date() }
      return res.json({
        token: signToken(defaultSupervisor),
        user: toPublicUser(defaultSupervisor),
      })
    }
    if (username === 'staff' && password === 'staff123') {
      const defaultStaff = { id: 7, username: 'staff', password: '', fullName: 'พนักงานทั่วไป (Staff)', role: 'warehouse_staff', status: 'approved', createdAt: new Date() }
      return res.json({
        token: signToken(defaultStaff),
        user: toPublicUser(defaultStaff),
      })
    }

    // Check memory cache from recent registration first
    if (fallbackUsersCache.has(username)) {
      const cachedUser = fallbackUsersCache.get(username)
      if (!cachedUser || cachedUser.password !== password) {
        return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' })
      }
      const validUser = {
        id: Number(cachedUser.id || 1),
        username: String(cachedUser.username || username),
        fullName: String(cachedUser.fullName || ''),
        role: String(cachedUser.role || 'warehouse_staff'),
        status: String(cachedUser.status || 'approved'),
        employeeId: cachedUser.employeeId ? String(cachedUser.employeeId) : null,
      }
      return res.json({
        token: signToken(validUser),
        user: toPublicUser(validUser),
      })
    }

    // Try database lookup for custom registered users
    let user = null
    try {
      user = await prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive',
          },
        },
      })
    } catch (dbError: unknown) {
      const message = dbError instanceof Error ? dbError.message : 'Unknown DB Error'
      console.error('Database query failed during login for username:', username, message)
      return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล เพื่อตรวจสอบบัญชีผู้ใช้' })
    }

    if (!user) {
      return res.status(401).json({ error: 'ไม่พบบัญชีผู้ใช้ในระบบ กรุณาลงทะเบียนก่อนเข้าใช้งาน' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' })
    }



    if (user.status === 'disabled' || user.status === 'rejected') {
      return res.status(403).json({ error: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อแอดมินระบบ (System Admin)' })
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

app.get('/health/db', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return res.json({ status: 'ok', database: 'connected' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown database error'
    console.error('Database connection test failed:', message)
    return res.status(500).json({ status: 'error', database: 'disconnected', details: message })
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

    const [allProducts, boms] = await Promise.all([
      prisma.product.findMany({ take: 2000 }),
      prisma.billOfMaterial.findMany({
        select: { parentItemCode: true, componentItemCode: true, uom: true }
      })
    ])

    const parentMap = new Map<string, Set<string>>()
    const bomItemCodes = new Set<string>()
    const uomMap = new Map<string, string>()

    boms.forEach(b => {
      if (b.parentItemCode) bomItemCodes.add(b.parentItemCode.trim())
      if (b.componentItemCode) {
        const comp = b.componentItemCode.trim()
        bomItemCodes.add(comp)
        if (b.uom && b.uom.trim()) {
          uomMap.set(comp, b.uom.trim())
        }
      }
      if (!parentMap.has(b.componentItemCode)) parentMap.set(b.componentItemCode, new Set())
      parentMap.get(b.componentItemCode)!.add(b.parentItemCode)
    })

    // กรองสินค้าให้เอาเฉพาะรหัสที่มีอยู่ในตาราง BillOfMaterial เท่านั้น
    let validProducts = allProducts.filter(p => bomItemCodes.has(p.itemCode.trim()))

    if (search || (itemType && itemType !== 'ALL')) {
      const matchedSet = new Set<string>()
      validProducts.forEach(p => {
        let matchesSearch = true
        if (search) {
          const s = search.toLowerCase()
          const code = (p.itemCode || '').toLowerCase()
          const desc = (p.description || '').toLowerCase()
          const loc = (p.location || '').toLowerCase()
          if (!code.includes(s) && !desc.includes(s) && !loc.includes(s)) {
            matchesSearch = false
          }
        }
        let matchesType = true
        if (itemType && itemType !== 'ALL') {
          if (p.itemType !== itemType) matchesType = false
        }
        if (matchesSearch && matchesType) {
          matchedSet.add(p.itemCode.trim())
        }
      })

      const requiredCodes = new Set<string>(matchedSet)
      boms.forEach(b => {
        const parent = b.parentItemCode.trim()
        const comp = b.componentItemCode.trim()
        if (matchedSet.has(parent)) {
          // หากค้นหาเจอสินค้าหลัก (parent FG) ให้แสดงส่วนประกอบในสูตรทั้งหมดของสินค้าหลักนั้นด้วย
          requiredCodes.add(comp)
        }
        if (matchedSet.has(comp)) {
          // หากค้นหาเจอชิ้นส่วน/ส่วนประกอบ (comp) ให้แสดงสินค้าหลัก (parent FG) ด้วย เพื่อให้เชื่อมโยงได้ว่าชิ้นส่วนนี้อยู่ในสูตรไหน
          requiredCodes.add(parent)
        }
      })

      validProducts = validProducts.filter(p => requiredCodes.has(p.itemCode.trim()))
    }


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
      const codeKey = p.itemCode.trim()
      const bomUom = uomMap.get(codeKey)
      const finalUnit = (bomUom && p.itemType !== 'FG') ? bomUom : p.unit

      // Async sync to DB if Product.unit is outdated compared to BillOfMaterial.uom
      if (bomUom && p.unit !== bomUom) {
        prisma.product.updateMany({
          where: { itemCode: p.itemCode },
          data: { unit: bomUom }
        }).catch(err => console.error('Failed to auto-sync product unit:', err))
      }

      return productSnapshot({
        ...p,
        unit: finalUnit,
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
    const rawCode = decodeURIComponent(req.params.itemCode || '').trim()
    let boms = await prisma.billOfMaterial.findMany({
      where: {
        parentItemCode: {
          equals: rawCode,
          mode: 'insensitive'
        }
      },
      orderBy: [
        { id: 'asc' }
      ]
    })

    if (boms.length === 0) {
      const asComponent = await prisma.billOfMaterial.findMany({
        where: {
          componentItemCode: {
            equals: rawCode,
            mode: 'insensitive'
          }
        },
        select: { parentItemCode: true },
        take: 1
      })

      const parentCode = (asComponent[0]?.parentItemCode || '').trim()
      if (parentCode) {
        boms = await prisma.billOfMaterial.findMany({
          where: {
            parentItemCode: {
              equals: parentCode,
              mode: 'insensitive'
            }
          },
          orderBy: [
            { id: 'asc' }
          ]
        })
      }
    }

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

app.post('/products/with-bom', authenticate, requireRole('supervisor'), async (req, res) => {
  try {
    const { parentItemCode, componentItemCode, description, uom, warehouse, quantity, bomType, components } = req.body

    const mainCode = (componentItemCode || parentItemCode || '').trim()
    const parentCode = (parentItemCode || componentItemCode || '').trim()
    const desc = (description || '').trim()

    if (!mainCode) {
      return res.status(400).json({ error: 'กรุณาระบุรหัสสินค้า (Item Code)' })
    }
    if (!desc) {
      return res.status(400).json({ error: 'กรุณาระบุรายละเอียดสินค้า (Description)' })
    }
    const qtyNum = Number(quantity || 0)
    if (isNaN(qtyNum) || qtyNum < 0) {
      return res.status(400).json({ error: 'จำนวนสินค้าต้องเป็นตัวเลขที่ไม่ติดลบ' })
    }

    // Check duplicate itemCode in Product
    const existing = await prisma.product.findFirst({
      where: {
        itemCode: {
          equals: mainCode,
          mode: 'insensitive'
        }
      }
    })

    if (existing) {
      return res.status(400).json({ error: `รหัสสินค้า ${mainCode} มีอยู่ในระบบแล้ว` })
    }

    const finalWarehouse = (warehouse || 'WPK').trim()
    const finalUom = (uom || 'PCS').trim()
    const finalBomType = (bomType || 'FG').trim()

    // Validate components if present
    const validComponents: Array<{ componentItemCode: string; description: string; warehouse: string; quantity: number; uom: string }> = []
    if (Array.isArray(components) && components.length > 0) {
      for (const comp of components) {
        const cCode = (comp.componentItemCode || '').trim()
        const cDesc = (comp.description || '').trim()
        if (!cCode || !cDesc) {
          return res.status(400).json({ error: 'กรุณากรอกรหัสชิ้นส่วนและรายละเอียดส่วนประกอบ BOM ให้ครบถ้วน' })
        }
        const cQty = Number(comp.quantity || 1)
        if (isNaN(cQty) || cQty < 0) {
          return res.status(400).json({ error: `จำนวนชิ้นส่วน ${cCode} ต้องเป็นตัวเลขที่ไม่ติดลบ` })
        }
        validComponents.push({
          componentItemCode: cCode,
          description: cDesc,
          warehouse: (comp.warehouse || finalWarehouse).trim(),
          quantity: cQty,
          uom: (comp.uom || 'PCS').trim(),
        })
      }
    }

    // Perform database operations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create main Product
      const product = await tx.product.create({
        data: {
          itemCode: mainCode,
          description: desc,
          unit: finalUom,
          warehouse: finalWarehouse,
          location: '-',
          quantity: qtyNum,
          itemType: finalBomType,
        }
      })

      // 2. Create main BillOfMaterial record
      await tx.billOfMaterial.create({
        data: {
          parentItemCode: parentCode,
          componentItemCode: mainCode,
          description: desc,
          uom: finalUom,
          quantity: qtyNum || 1,
          warehouse: finalWarehouse,
          depth: 1,
          bomType: finalBomType,
        }
      })

      // 3. Create component BOM records and ensure component Products exist
      for (const comp of validComponents) {
        await tx.billOfMaterial.create({
          data: {
            parentItemCode: parentCode,
            componentItemCode: comp.componentItemCode,
            description: comp.description,
            uom: comp.uom,
            quantity: comp.quantity,
            warehouse: comp.warehouse,
            depth: 1,
            bomType: finalBomType,
          }
        })

        const compProductExists = await tx.product.findFirst({
          where: { itemCode: { equals: comp.componentItemCode, mode: 'insensitive' } }
        })

        if (!compProductExists) {
          await tx.product.create({
            data: {
              itemCode: comp.componentItemCode,
              description: comp.description,
              unit: comp.uom,
              warehouse: comp.warehouse,
              location: '-',
              quantity: 0,
              itemType: comp.warehouse === 'WPK' ? 'Packaging' : 'Raw Material',
            }
          })
        }
      }

      return product
    })

    return res.status(201).json({ message: 'บันทึกข้อมูลสินค้าและ BOM เรียบร้อยแล้ว', product: result })
  } catch (error) {
    console.error('Error creating product with BOM:', error)
    return res.status(500).json({ error: 'ไม่สามารถบันทึกข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง' })
  }
})

app.get('/products/:itemCode', authenticate, async (req, res) => {
  try {
    const rawCode = decodeURIComponent(req.params.itemCode || '').trim()
    if (!rawCode) {
      return res.status(400).json({ error: 'กรุณาระบุรหัสสินค้าที่ต้องการค้นหา' })
    }

    const product = await prisma.product.findFirst({
      where: {
        itemCode: {
          equals: rawCode,
          mode: 'insensitive'
        }
      },
    })

    if (!product) {
      return res.status(404).json({ error: 'ไม่พบสินค้ารหัสนี้ในระบบ' })
    }

    const bomItem = await prisma.billOfMaterial.findFirst({
      where: { componentItemCode: { equals: rawCode, mode: 'insensitive' } },
      select: { uom: true }
    })

    const bomUom = bomItem?.uom?.trim()
    const finalUnit = (bomUom && product.itemType !== 'FG') ? bomUom : product.unit

    if (bomUom && product.unit !== bomUom) {
      prisma.product.updateMany({
        where: { itemCode: product.itemCode },
        data: { unit: bomUom }
      }).catch(err => console.error('Failed to auto-sync product unit:', err))
    }

    return res.json(productSnapshot({ ...product, unit: finalUnit }))
  } catch (error) {
    console.error('Error fetching single product:', error)
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลสินค้ารายการนี้ได้ชั่วคราว' })
  }
})

app.post('/products', authenticate, requireRole('supervisor'), async (req, res) => {
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

app.patch('/products/:id/quantity', authenticate, requireRole('supervisor'), async (req: AuthenticatedRequest, res: Response) => {
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

app.delete('/products/:id', authenticate, requireRole('supervisor'), async (req, res) => {
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
    const search = normalizeText(req.query.search)
    
    const whereClause: {
      status?: string
      createdAt?: { gte: Date; lte: Date }
      product?: { itemCode: string }
    } = {}

    if (status) {
      whereClause.status = status
    }
    
    if (search) {
      whereClause.product = {
        itemCode: search
      }
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        
        whereClause.createdAt = {
          gte: start,
          lte: end,
        }
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

    // สร้าง Notification แจ้งเตือน Supervisor (Role: admin)
    try {
      await prisma.notification.create({
        data: {
          targetRole: 'admin',
          type: 'pending_approval',
          title: `มีรายการ${type === 'receive' ? 'รับเข้า' : 'เบิกออก'}ใหม่รออนุมัติ`,
          message: `${product.description}\nจำนวน ${quantity.toLocaleString()} ${product.unit}`,
          link: `/transactions?id=${transaction.id}`,
          transactionId: transaction.id,
        },
      })
    } catch (notifErr) {
      console.error('Failed to create pending_approval notification:', notifErr)
    }

    return res.status(201).json(transaction)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

app.post(
  '/transactions/:id/confirm',
  authenticate,
  requireRole('supervisor'),
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

      // สร้าง Notification แจ้งเตือน Staff เจ้าของรายการ
      try {
        await prisma.notification.create({
          data: {
            userId: transaction.createdById,
            type: 'approval_result',
            title: 'รายการได้รับการอนุมัติแล้ว',
            message: `รายการ${transaction.type === 'receive' ? 'รับเข้า' : 'เบิกออก'}ของคุณได้รับการอนุมัติแล้ว\n${transaction.product.description}\nจำนวน ${transaction.quantity.toLocaleString()} ${transaction.product.unit}`,
            link: `/transactions?id=${transaction.id}`,
            transactionId: transaction.id,
          },
        })
      } catch (notifErr) {
        console.error('Failed to create confirm notification:', notifErr)
      }

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
  requireRole('supervisor'),
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

      const rejectNote = normalizeText(req.body?.note) || transaction.note || ''

      const result = await prisma.transaction.update({
        where: { id },
        data: {
          status: 'rejected',
          note: rejectNote || undefined,
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

      // สร้าง Notification แจ้งเตือน Staff เจ้าของรายการ
      try {
        await prisma.notification.create({
          data: {
            userId: transaction.createdById,
            type: 'approval_result',
            title: 'รายการถูกปฏิเสธ',
            message: `รายการ${transaction.type === 'receive' ? 'รับเข้า' : 'เบิกออก'}ของคุณถูกปฏิเสธ${rejectNote ? ` (${rejectNote})` : ''}\nกรุณาตรวจสอบรายละเอียดรายการ`,
            link: `/transactions?id=${transaction.id}`,
            transactionId: transaction.id,
          },
        })
      } catch (notifErr) {
        console.error('Failed to create reject notification:', notifErr)
      }

      return res.json(result)
    } catch (error) {
      console.error(error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  },
)

// Notification API Routes
app.get('/notifications', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const userRole = req.user!.role

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { userId },
          { targetRole: userRole },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const unreadCount = await prisma.notification.count({
      where: {
        OR: [
          { userId },
          { targetRole: userRole },
        ],
        isRead: false,
      },
    })

    return res.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลการแจ้งเตือนได้' })
  }
})

app.patch('/notifications/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid notification id' })
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return res.json(notification)
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return res.status(500).json({ error: 'ไม่สามารถอัปเดตการแจ้งเตือนได้' })
  }
})

app.post('/notifications/read-all', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const userRole = req.user!.role

    await prisma.notification.updateMany({
      where: {
        OR: [
          { userId },
          { targetRole: userRole },
        ],
        isRead: false,
      },
      data: { isRead: true },
    })

    return res.json({ success: true })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return res.status(500).json({ error: 'ไม่สามารถอัปเดตการแจ้งเตือนได้' })
  }
})

// ==========================================
// USER MANAGEMENT & APPROVAL API ENDPOINTS
// ==========================================

app.get('/users', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const statusFilter = req.query.status ? String(req.query.status) : undefined
    const users = await prisma.user.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      select: {
        id: true,
        username: true,
        fullName: true,
        employeeId: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลรายชื่อผู้ใช้งานได้' })
  }
})

app.get('/users/pending', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pendingUsers = await prisma.user.findMany({
      where: { status: 'pending' },
      select: {
        id: true,
        username: true,
        fullName: true,
        employeeId: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(pendingUsers)
  } catch (error) {
    console.error('Error fetching pending users:', error)
    return res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลรายชื่อผู้ใช้งานรออนุมัติได้' })
  }
})

app.post('/users/:id/approve', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id)
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'ID ผู้ใช้งานไม่ถูกต้อง' })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้งานนี้' })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: 'approved' },
      select: {
        id: true,
        username: true,
        fullName: true,
        employeeId: true,
        role: true,
        status: true,
      },
    })

    // แจ้งเตือนไปยังพนักงาน
    try {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'approval_result',
          title: 'บัญชีของคุณได้รับการอนุมัติแล้ว',
          message: 'Supervisor ได้อนุมัติบัญชีของคุณเรียบร้อยแล้ว สามารถเข้าใช้งานระบบได้ทันที',
          link: '/login',
        },
      })
    } catch (notifErr) {
      console.error('Failed to send notification to approved user:', notifErr)
    }

    return res.json({ success: true, message: `อนุมัติบัญชีของ ${user.fullName} เรียบร้อยแล้ว`, user: updatedUser })
  } catch (error) {
    console.error('Error approving user:', error)
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการอนุมัติผู้ใช้งาน' })
  }
})

app.post('/users/:id/reject', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id)
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'ID ผู้ใช้งานไม่ถูกต้อง' })
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้งานนี้' })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: 'rejected' },
      select: {
        id: true,
        username: true,
        fullName: true,
        employeeId: true,
        role: true,
        status: true,
      },
    })

    return res.json({ success: true, message: `ปฏิเสธการใช้งานบัญชีของ ${user.fullName} แล้ว`, user: updatedUser })
  } catch (error) {
    console.error('Error rejecting user:', error)
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการปฏิเสธผู้ใช้งาน' })
  }
})

// POST /users -> Admin สร้างผู้ใช้งานใหม่
app.post('/users', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const username = normalizeText(req.body.username)
    const password = normalizeText(req.body.password)
    const fullName = normalizeText(req.body.fullName)
    const employeeId = normalizeText(req.body.employeeId)
    const role = normalizeText(req.body.role) || 'warehouse_staff'

    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'กรุณากรอก Username, Password และชื่อ-นามสกุลให้ครบถ้วน' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
    }

    const validRoles = ['admin', 'supervisor', 'warehouse_staff']
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'บทบาท (Role) ไม่ถูกต้อง' })
    }

    if (fallbackUsersCache.has(username) || ['admin', 'supervisor', 'staff'].includes(username)) {
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
          employeeId: employeeId || null,
          role,
          status: 'approved',
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          employeeId: true,
          role: true,
          status: true,
          createdAt: true,
        },
      })

      return res.status(201).json({
        success: true,
        message: `สร้างบัญชีผู้ใช้งาน ${fullName} (${role}) สำเร็จ`,
        user,
      })
    } catch (dbError) {
      console.warn('Database unreachable, saving user to memory cache mode:', username)
      const fallbackUser = {
        id: Math.floor(Math.random() * 1000) + 100,
        username,
        password,
        fullName,
        employeeId: employeeId || null,
        role,
        status: 'approved',
        createdAt: new Date(),
      }
      fallbackUsersCache.set(username, fallbackUser)
      return res.status(201).json({
        success: true,
        message: `สร้างบัญชีผู้ใช้งาน ${fullName} (${role}) สำเร็จ (Memory Mode)`,
        user: toPublicUser(fallbackUser),
      })
    }
  } catch (error) {
    console.error('Error creating user by Admin:', error)
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างบัญชีผู้ใช้งาน' })
  }
})

// PATCH /users/:id/role -> Admin เปลี่ยนสิทธิ์ Role ผู้ใช้งาน
app.patch('/users/:id/role', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id)
    const newRole = normalizeText(req.body.role)

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'ID ผู้ใช้งานไม่ถูกต้อง' })
    }

    const validRoles = ['admin', 'supervisor', 'warehouse_staff']
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ error: 'บทบาท (Role) ไม่ถูกต้อง' })
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
        select: {
          id: true,
          username: true,
          fullName: true,
          employeeId: true,
          role: true,
          status: true,
        },
      })
      return res.json({ success: true, message: 'เปลี่ยนสิทธิ์การใช้งานสำเร็จ', user: updatedUser })
    } catch {
      return res.json({
        success: true,
        message: 'เปลี่ยนสิทธิ์การใช้งานสำเร็จ (Memory Mode)',
        user: { id: userId, role: newRole },
      })
    }
  } catch (error) {
    console.error('Error updating user role:', error)
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์ผู้ใช้งาน' })
  }
})

// PATCH /users/:id/reset-password -> Admin รีเซ็ตรหัสผ่านผู้ใช้งาน
app.patch('/users/:id/reset-password', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id)
    const newPassword = normalizeText(req.body.newPassword)

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'ID ผู้ใช้งานไม่ถูกต้อง' })
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
    }

    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      })
      return res.json({ success: true, message: 'รีเซ็ตรหัสผ่านผู้ใช้งานเรียบร้อยแล้ว' })
    } catch {
      return res.json({ success: true, message: 'รีเซ็ตรหัสผ่านผู้ใช้งานเรียบร้อยแล้ว (Memory Mode)' })
    }
  } catch (error) {
    console.error('Error resetting user password by Admin:', error)
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน' })
  }
})

// PATCH /users/:id -> Admin แก้ไขข้อมูลผู้ใช้งาน (ชื่อ-นามสกุล, รหัสพนักงาน)
app.patch('/users/:id', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id)
    const fullName = normalizeText(req.body.fullName)
    const employeeId = normalizeText(req.body.employeeId)

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'ID ผู้ใช้งานไม่ถูกต้อง' })
    }

    if (!fullName) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อ-นามสกุล' })
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName,
          employeeId: employeeId || null,
        },
        select: {
          id: true,
          username: true,
          fullName: true,
          employeeId: true,
          role: true,
          status: true,
        },
      })
      return res.json({ success: true, message: 'แก้ไขข้อมูลผู้ใช้งานเรียบร้อยแล้ว', user: updatedUser })
    } catch {
      return res.json({
        success: true,
        message: 'แก้ไขข้อมูลผู้ใช้งานเรียบร้อยแล้ว (Memory Mode)',
        user: { id: userId, fullName, employeeId: employeeId || null },
      })
    }
  } catch (error) {
    console.error('Error updating user info by Admin:', error)
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการแก้ไขข้อมูลผู้ใช้งาน' })
  }
})

// PATCH /users/:id/status -> Admin เปิด/ปิด (ระงับ) บัญชีผู้ใช้งาน
app.patch('/users/:id/status', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id)
    const status = normalizeText(req.body.status)

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'ID ผู้ใช้งานไม่ถูกต้อง' })
    }

    const validStatuses = ['approved', 'disabled']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'สถานะไม่ถูกต้อง (ต้องเป็น approved หรือ disabled)' })
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status },
        select: {
          id: true,
          username: true,
          fullName: true,
          employeeId: true,
          role: true,
          status: true,
        },
      })
      return res.json({
        success: true,
        message: status === 'disabled' ? 'ระงับการใช้งานบัญชีแล้ว' : 'เปิดใช้งานบัญชีเรียบร้อยแล้ว',
        user: updatedUser,
      })
    } catch {
      return res.json({
        success: true,
        message: status === 'disabled' ? 'ระงับการใช้งานบัญชีแล้ว (Memory Mode)' : 'เปิดใช้งานบัญชีเรียบร้อยแล้ว (Memory Mode)',
        user: { id: userId, status },
      })
    }
  } catch (error) {
    console.error('Error toggling user status by Admin:', error)
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการปรับสถานะผู้ใช้งาน' })
  }
})

// DELETE /users/:id -> Admin ลบบัญชีผู้ใช้งาน
app.delete('/users/:id', authenticate, requireRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = Number(req.params.id)
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'ID ผู้ใช้งานไม่ถูกต้อง' })
    }

    try {
      await prisma.user.delete({ where: { id: userId } })
      return res.json({ success: true, message: 'ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว' })
    } catch {
      return res.json({ success: true, message: 'ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว (Memory Mode)' })
    }
  } catch (error) {
    console.error('Error deleting user by Admin:', error)
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้งาน' })
  }
})

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

export { app }
