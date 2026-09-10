# WPK MMS — Packaging Material Warehouse Management System

ระบบบริหารจัดการคลังสินค้าบรรจุภัณฑ์
WPK MMS (Packaging Material Warehouse Management System) is a web-based system for managing packaging material warehouse operations.
ลดความผิดพลาดจากการบันทึกด้วยมือ พร้อมระบบตัดสต็อกตามหลัก FIFO และระบบอนุมัติรายการ

## โครงสร้างโปรเจกต์

```
WPK-MMS/
├── backend/           → Express + Prisma API (TypeScript)
│   ├── prisma/        → Database schema & migrations
│   └── src/           → Source code (routes, middleware)
├── frontend/          → Next.js frontend (App Router + Tailwind)
│   ├── app/           → Pages & layouts
│   └── lib/           → Shared utilities (auth, API helpers)
├── scripts/           → Utility scripts & data files
│   ├── import_stock.py
│   ├── read_excel.py
│   └── data/          → Excel data files
├── AGENTS.md          → กฎสำหรับ AI Agents
├── CONTEXT.md         → บริบทและ spec ของระบบ
├── AUTH_SETUP.md      → เอกสาร Authentication
├── DEMO_CHECKLIST.md  → เช็กลิสต์ขั้นตอนการนำเสนอและสาธิตระบบ
└── SYSTEM_BASELINE.md → เอกสารสรุปสถานะระบบและสถาปัตยกรรมฉบับสมบูรณ์ (Baseline)
```

## เอกสารระบบ (System Documentation)
- [SYSTEM_BASELINE.md](SYSTEM_BASELINE.md) — เอกสารสรุปสถานะระบบขั้นสุดท้าย สถาปัตยกรรม ฟีเจอร์ สิทธิ์ 3 Roles, FIFO, Security, และผลการทดสอบทั้งหมด
- [DEMO_CHECKLIST.md](DEMO_CHECKLIST.md) — เช็กลิสต์ขั้นตอนการนำเสนอและสาธิตระบบ (Demo Guide & Script)
- [CONTEXT.md](CONTEXT.md) — บริบทและข้อกำหนดระบบคลังสินค้า
- [AGENTS.md](AGENTS.md) — ข้อกำหนดและกฎการพัฒนาของโปรเจกต์

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
cd frontend && npm install
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
