# QR-Code — ระบบสแกน QR สำหรับรับ/จ่ายสินค้า

ระบบจัดการสต็อกด้วย QR Code สำหรับคลังสินค้า ENEOS  
ลดความผิดพลาดจากการบันทึกด้วยมือ พร้อมระบบอนุมัติรายการ

## โครงสร้างโปรเจกต์

```
QR-Code/
├── backend/           → Express + Prisma API (TypeScript)
│   ├── prisma/        → Database schema & migrations
│   └── src/           → Source code (routes, middleware)
├── QRcodeWebapp/      → Next.js frontend (App Router + Tailwind)
│   ├── app/           → Pages & layouts
│   └── lib/           → Shared utilities (auth, API helpers)
├── scripts/           → Utility scripts & data files
│   ├── import_stock.py
│   ├── read_excel.py
│   └── data/          → Excel data files
├── AGENTS.md          → กฎสำหรับ AI Agents
├── CONTEXT.md         → บริบทและ spec ของระบบ
└── AUTH_SETUP.md      → เอกสาร Authentication
```

## เทคโนโลยี

| ส่วน       | เทคโนโลยี                        |
|-----------|----------------------------------|
| Frontend  | Next.js + Tailwind CSS           |
| Backend   | Node.js + Express + TypeScript   |
| Database  | PostgreSQL (Supabase)            |
| ORM       | Prisma                           |
| Auth      | JWT + bcryptjs                   |

## Quick Start

### 1. ติดตั้ง dependencies

```bash
# Root (monorepo tools)
npm install

# Backend
cd backend && npm install

# Frontend
cd QRcodeWebapp && npm install
```

### 2. ตั้งค่า Environment

```bash
cp backend/.env.example backend/.env
# แก้ไข DATABASE_URL, JWT_SECRET ใน backend/.env
```

### 3. สร้างตาราง Database

```bash
cd backend
npx prisma db push
```

### 4. รัน Development Server

```bash
# รันทั้ง frontend + backend พร้อมกัน (จาก root)
npm run dev

# หรือรันแยก
npm run dev:frontend   # http://localhost:3000
npm run dev:backend    # http://localhost:4000
```
