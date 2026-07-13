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
├── frontend/          ← Next.js frontend
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
### 11. 📝 บันทึกการทำงาน
- ทุกครั้งที่แก้ไขโค้ด จะต้องบันทึกข้อมูลการทำงาน ในไฟล์ MEMORIES.md
- ข้อมูลการทำงานจะต้องบันทึกเป็นภาษาไทย 

### 12. ⚙️ Engineering Workflow & AI Skills
ในการพัฒนาฟีเจอร์ใหม่หรือแก้ปัญหา ให้ AI Agents เรียกใช้ Skills ในโฟลเดอร์ `.skill/` เพื่อควบคุมคุณภาพโค้ดตามมาตรฐานวิศวกรรมซอฟต์แวร์:
- **Planning & Architecture:** ก่อนเริ่มฟีเจอร์ใหญ่ ให้ใช้สกิล `to-spec` เพื่อเขียน PRD (Product Requirements Document) และใช้ `codebase-design` หรือ `improve-codebase-architecture` เพื่อออกแบบ/รีวิวสถาปัตยกรรมโค้ด
- **Test-Driven Development (TDD):** ใช้สกิล `tdd` เพื่อบังคับกระบวนการ Red-Green-Refactor (เขียนเทสต์ให้เฟล -> เขียนโค้ดให้ผ่าน -> จัดระเบียบ) ทุกครั้งที่มีการสร้างฟีเจอร์หรือแก้ไข Logic สำคัญ
- **Bug Diagnosing:** เมื่อเจอบั๊ก ห้ามเดาและแก้ทันที ให้ใช้สกิล `diagnosing-bugs` เพื่อจำลองปัญหา ตั้งสมมติฐาน และพิสูจน์ก่อน
- **Code Review:** ก่อนส่งมอบงาน AI ต้องใช้สกิล `code-review` ตรวจทานโค้ดตัวเองทุกครั้ง เพื่อให้มั่นใจว่าตรงตามกฎ (เช่น ห้ามใช้ `any`) และมีความปลอดภัย
- **Domain Modeling:** ใช้สกิล `grill-with-docs` เมื่อต้องการสัมภาษณ์เพื่อเจาะลึกโครงสร้างระบบ และอัปเดตเอกสารอัตโนมัติ

### 13. 🎨 UI/UX Design & Impeccable Standards
- **อ้างอิง Design System:** ทุกครั้งที่มีการสร้างหรือแก้ไขหน้าจอ (UI) AI ต้องอ้างอิงไฟล์ `DESIGN.md` และ `PRODUCT.md` เป็นหลัก
- **ห้ามละเมิด Anti-patterns:** ห้ามใช้ดีไซน์ที่เป็น "AI Slop" (เช่น ฟอนต์ Inter, สี Gradients ม่วงฟ้า, การ์ดซ้อนการ์ด, เงาดำเข้ม) ตามกฎ Impeccable ที่ระบุใน `DESIGN.md` อย่างเด็ดขาด
- **รันตรวจสอบ (Lint):** หากไม่แน่ใจในโครงสร้าง UI ให้แนะนำให้ User หรือรันคำสั่ง `npm run lint:ui` เพื่อตรวจสอบคุณภาพโค้ด

---

<!-- BEGIN:nextjs-agent-rules -->
## Next.js Rules (QRcodeWebapp)

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
