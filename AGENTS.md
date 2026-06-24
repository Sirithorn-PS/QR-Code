# AGENTS.md — กฎของโปรเจกต์สำหรับ AI Agents

## กฎหลัก (Mandatory Rules)

### 1. ❌ ห้ามใช้ `any`
- ห้ามใช้ `any` type ใน TypeScript เด็ดขาด
- ให้ใช้ type ที่ชัดเจน เช่น `string`, `number`, `Record<string, unknown>` แทน
- กรณีไม่แน่ใจ type ให้ใช้ `unknown` แล้ว narrow ด้วย type guard
- ตัวอย่างที่ถูกต้อง:
  ```typescript
  // ❌ ห้าม
  function handle(data: any) { ... }
  } catch (error: any) { ... }

  // ✅ ถูกต้อง
  function handle(data: unknown) { ... }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
  }
  ```

### 2. ❌ อย่าแก้ไฟล์ที่ไม่เกี่ยวข้อง
- แก้ไขเฉพาะไฟล์ที่เกี่ยวข้องกับงานที่ได้รับมอบหมายเท่านั้น
- ห้ามแก้ไข formatting, import order, หรือ refactor โค้ดที่ไม่เกี่ยวกับงาน
- ถ้าเจอปัญหาในไฟล์อื่น ให้แจ้ง user แทนการแก้เอง

### 3. 📦 Compact Context ก่อนทำงาน
- ก่อนเริ่มงานให้ทำการ compact เพื่อลด input token แต่ยังคงเนื้อหางานให้ดี
- อ่านเฉพาะไฟล์ที่จำเป็น ไม่ต้องอ่านทั้งโปรเจกต์
- ใช้ grep ค้นหาเฉพาะจุดที่เกี่ยวข้องแทนการอ่านไฟล์ทั้งหมด

### 4. 🧑‍💻 เขียนโค้ดแบบ Beginner-Friendly
- เขียนโค้ดให้เรียบง่ายและอ่านง่าย ไม่ต้อง overengineer
- ใช้ชื่อตัวแปรและฟังก์ชันที่อธิบายตัวเองได้
- เพิ่ม comment อธิบายในจุดที่ซับซ้อนเท่าที่จำเป็น
- หลีกเลี่ยง pattern ที่ซับซ้อนเกินไป เช่น:
  - ❌ Generic types ที่ซ้อนกันหลายชั้น
  - ❌ Abstract factory / decorator pattern ที่ไม่จำเป็น
  - ❌ Higher-order function ที่ซ้อนกันเกิน 2 ชั้น
- ให้เขียนแบบตรงไปตรงมา (straightforward) ให้มือใหม่อ่านรู้เรื่อง

---

## กฎเพิ่มเติม (Project-Specific Rules)

### 5. 📁 โครงสร้างโปรเจกต์
```
QR-Code/
├── backend/           ← Express + Prisma API
│   ├── prisma/        ← Database schema
│   └── src/           ← Source code
├── QRcodeWebapp/      ← Next.js frontend
│   ├── app/           ← Pages & layouts
│   └── lib/           ← Shared utilities
└── scripts/           ← Utility scripts & data files
```

### 6. 🏷️ Naming Conventions
- **ไฟล์ TypeScript**: ใช้ camelCase เช่น `authService.ts`
- **Component React**: ใช้ PascalCase เช่น `LoginPage.tsx`
- **ตัวแปร / ฟังก์ชัน**: ใช้ camelCase เช่น `getUserById`
- **ค่าคงที่**: ใช้ UPPER_SNAKE_CASE เช่น `JWT_SECRET`
- **Database columns**: ใช้ camelCase (ตาม Prisma convention)

### 7. 🔒 ความปลอดภัย
- ห้าม hardcode secrets, passwords, หรือ API keys ในโค้ด
- ใช้ environment variables ผ่าน `process.env` เสมอ
- ไฟล์ `.env` ต้องไม่ถูก commit (อยู่ใน `.gitignore`)

### 8. 📝 Git Commit
- เขียน commit message เป็นภาษาอังกฤษ กระชับ ชัดเจน
- ใช้ format: `type: description` เช่น
  - `feat: add login page`
  - `fix: correct stock calculation`
  - `docs: update README`

### 9. 🗄️ Database (Prisma)
- แก้ไข schema ใน `backend/prisma/schema.prisma` เท่านั้น
- หลังแก้ schema ต้องรัน `npx prisma db push` หรือ `npx prisma migrate dev`
- ใช้ `directUrl` สำหรับ migration เมื่อใช้ connection pooler

### 10. 🌐 API Convention
- Base URL: `http://localhost:4000`
- ใช้ RESTful pattern
- ทุก endpoint ที่ต้องการ auth ให้ส่ง `Authorization: Bearer <token>` header
- Response format: JSON เสมอ
### 10. บันทึกการทำงาน
- ทุกครั้งที่แก้ไขโค้ด จะต้องบันทึกข้อมูลการทำงาน ในไฟล์ MEMORIES.md
- ข้อมูลการทำงานจะต้องบันทึกเป็นภาษาไทย 

---

<!-- BEGIN:nextjs-agent-rules -->
## Next.js Rules (QRcodeWebapp)

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
