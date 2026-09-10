# WPK MMS — System Baseline & Final Project Documentation
**Packaging Material Warehouse Management System (WPK MMS)**  
**Version:** 1.0.0-baseline  
**Status:** Completed & Accepted (Post-Security Hardening)  
**Git Baseline:** `43fa3b005c9190318ce3b3973f6f246e845bf08a` (Branch: `main`)
**Date:** September 10, 2026  

---

## 1. Project Overview (ภาพรวมโครงการ)
**WPK MMS** เป็นระบบเว็บแอปพลิเคชันสำหรับบริหารจัดการคลังสินค้าบรรจุภัณฑ์ (Packaging Material Warehouse Management System) โดยใช้เทคโนโลยีสแกน QR Code สำหรับบันทึกธุรกรรมรับเข้า (Check-in) และเบิกจ่าย (Check-out) แบบ Real-time ออกแบบมาเพื่อทดแทนกระบวนการจดบันทึกด้วยมือ (Manual Paperwork) ลดความผิดพลาดจาก Human Error และช่วยให้ตรวจสอบยอดสต็อกคงเหลือได้อย่างแม่นยำ พร้อมระบบควบคุมการตัดสต็อกตามลำดับก่อนหลัง (First-In, First-Out: FIFO) และระบบอนุมัติธุรกรรมโดยหัวหน้างาน (Supervisor Approval)

---

## 2. System Purpose (วัตถุประสงค์ของระบบ)
1. **ลดข้อผิดพลาดจากการบันทึกด้วยมือ:** เปลี่ยนการกรอกข้อมูลและนับสต็อกด้วยกระดาษมาเป็นการสแกน QR Code และคำนวณยอดคงเหลืออัตโนมัติ
2. **ควบคุมการเบิกจ่ายตามหลัก FIFO:** บังคับตัดสต็อกบรรจุภัณฑ์ตามอายุการรับเข้า (Lot ที่เข้าคลังก่อนต้องถูกตัดออกไปใช้ก่อน)
3. **ป้องกันสต็อกติดลบและการเบิกเกินจริง:** มีระบบ Inline Validation และ Submit Guard ตรวจสอบจำนวนเบิกเทียบกับสต็อกคงเหลือจริงทันทีบนหน้าสแกน
4. **ตรวจสอบและอนุมัติอย่างโปร่งใส:** ทุกธุรกรรมที่สร้างโดยพนักงาน (Staff) จะต้องผ่านการตรวจสอบและอนุมัติ/ปฏิเสธโดยหัวหน้างาน (Supervisor) ก่อนนำไปตัดสต็อกจริง
5. **แจ้งเตือนสต็อกต่ำกว่าเกณฑ์ (Low Stock Notification):** ตรวจสอบยอดคงเหลือเทียบกับ Minimum Stock (`minStock`) และแจ้งเตือนหัวหน้างานแบบเรียลไทม์เพื่อวางแผนสั่งซื้อล่วงหน้า

---

## 3. Technology Stack & Architecture (สถาปัตยกรรมระบบ)
- **Frontend:** Next.js (App Router), React 19, Tailwind CSS, Lucide React, Framer Motion
- **Backend:** Node.js, Express, TypeScript
- **Database & ORM:** PostgreSQL (Supabase Connection Pooler / Direct), Prisma ORM
- **Authentication:** JSON Web Token (JWT) with 24h Expiration, Bcryptjs Password Hashing
- **Testing Tools:** Vitest, Testing Library, Supertest

```
QR-Code/
├── backend/                  ← Express + Prisma API
│   ├── prisma/               ← Schema & Migrations
│   ├── src/                  ← API Endpoints, Middlewares, Logic
│   └── __tests__/            ← Vitest API & Integration Tests
├── frontend/                 ← Next.js 16 Web Application
│   ├── app/                  ← Next.js App Router Pages
│   ├── components/           ← Reusable UI Components
│   ├── lib/                  ← API Client, Auth, Utilities
│   ├── public/               ← Static Assets & Documentation
│   └── __tests__/            ← Vitest Unit & Component Tests
└── scripts/                  ← Data Import Scripts & Utilities
```

---

## 4. User Roles & Access Control (บทบาทและสิทธิ์การใช้งาน)

ระบบแบ่งบทบาทผู้ใช้งานออกเป็น 3 ระดับอย่างเข้มงวด (Role-Based Access Control - RBAC):

| บทบาท (Role) | สิทธิ์และขอบเขตความรับผิดชอบ | ขอบเขตการเข้าถึงข้อมูล (Data Scope) |
|---|---|---|
| **System Admin** (`admin`) | ดูแลระบบบัญชีผู้ใช้งาน: สร้างผู้ใช้ใหม่, กำหนด Role, เปิด/ระงับบัญชี (`approved`/`disabled`), รีเซ็ตรหัสผ่าน, แก้ไขข้อมูลพนักงาน | จัดการตาราง User ทั้งหมด แต่**ไม่มีสิทธิ์**อนุมัติ/ปฏิเสธธุรกรรมคลังสินค้า |
| **Supervisor** (`supervisor`) | ผู้ควบคุมดูแลคลังสินค้า: ตรวจสอบและอนุมัติ/ปฏิเสธธุรกรรมรับ-จ่าย, ตรวจสอบสต็อก, จัดการ Min Stock, ดูรายงานย้อนหลัง, ส่งออกไฟล์ Excel | เห็นข้อมูลสต็อกและธุรกรรมของทั้งคลังสินค้า (Warehouse-wide Scope) |
| **Warehouse Staff** (`warehouse_staff`) | พนักงานปฏิบัติการคลังสินค้า: เดินสแกน QR Code เพื่อรับเข้า/เบิกจ่าย, ดูประวัติการทำรายการของตนเอง, ดูสถิติการทำงานและภาพรวมคลังสินค้าที่จำเป็น | **Data Isolation:** เห็นเฉพาะประวัติและสถิติธุรกรรมของตนเองเท่านั้น ไม่สามารถเห็นธุรกรรมของพนักงานคนอื่นได้ |

---

## 5. Role & Permission Boundary (ขอบเขตการคุ้มครองสิทธิ์)
1. **API Authorization Middleware (`requireRole`):** คุ้มครองทุก Endpoint ใน Backend โดยตรวจสอบ Role จาก JWT Token ที่ผ่านการ Verify แล้ว
2. **Staff Data Isolation:** ใน `GET /transactions` ฝั่ง Backend บังคับใส่เงื่อนไข `whereClause.createdById = req.user.id` เสมอเมื่อผู้ใช้ล็อกอินเป็น `warehouse_staff` ทำให้ไม่สามารถ Bypass ผ่าน Query Parameter ได้
3. **Transaction Approval Guard:** เฉพาะ `supervisor` เท่านั้นที่สามารถเรียก `POST /transactions/:id/confirm` หรือ `POST /transactions/:id/reject` หาก Staff พยายามเรียกจะถูกปฏิเสธด้วย HTTP 403 Forbidden
4. **Report Access Guard:** หน้า Reports (`/reports`) และ API Export Excel (`/reports/export-excel`) สงวนสิทธิ์เฉพาะ `supervisor` เท่านั้น

---

## 6. Stock & Packaging Management (การจัดการสินค้าและบรรจุภัณฑ์)
- **ข้อมูล Master Data:** รองรับรหัสสินค้า (`itemCode`), หมายเลขผลิตภัณฑ์ (`productId`), ชื่อสินค้า/คำอธิบาย (`description`), หน่วยนับ (`unit`), คลังสินค้า (`warehouse`), ตำแหน่งจัดเก็บ (`location`), ประเภท (`itemType`: FG, Packaging), สถานะ (`status`: active, inactive), จำนวนคงเหลือ (`quantity`), และเกณฑ์ขั้นต่ำ (`minStock`)
- **Bill of Materials (BOM) Mapping:** เชื่อมโยงสินค้าสำเร็จรูป (Finish Goods - FG) เข้ากับวัตถุดิบบรรจุภัณฑ์ (Packaging) ผ่านตาราง `BomMapping`
- **Product Lifecycle Guards:** การลบสินค้ามี Guard คุ้มครอง 4 ชั้น (ห้ามลบหากสต็อก > 0, มีประวัติธุรกรรม, มีประวัติ Lot, หรือเป็นส่วนหนึ่งของสูตร BOM)

---

## 7. Transaction Management (การจัดการธุรกรรมรับเข้า-เบิกจ่าย)
- **ประเภทธุรกรรม:** รับเข้า (`receive`) และ เบิกจ่าย (`issue`)
- **สถานะธุรกรรม (Transaction Status Lifecycle):**
  1. `pending`: เมื่อ Staff สแกนสร้างรายการ ข้อมูลจะถูกบันทึกพร้อม Snapshot ของสินค้าและรอการตรวจสอบ
  2. `confirmed`: เมื่อ Supervisor ตรวจสอบความถูกต้องและกดยืนยัน ระบบจะทำการอัปเดตยอดสต็อกและตัด/เพิ่ม Lot ตามจริง
  3. `rejected`: หากข้อมูลไม่ถูกต้อง Supervisor กดยกเลิก รายการจะถูกปฏิเสธพร้อมบันทึกเหตุผล โดยไม่มีการแตะต้องยอดสต็อกจริง

---

## 8. First-In, First-Out (FIFO) Algorithm
ระบบบังคับใช้อัลกอริทึมตัดสต็อกแบบ First-In, First-Out (FIFO) สำหรับการเบิกจ่ายสินค้า:
1. **การรับเข้าสินค้า (Receive):** ระบบสร้างแถวข้อมูล `ProductLot` ใหม่ โดยบันทึกวันที่รับเข้า (`receivedDate`), Lot Number, และจำนวนคงเหลือของ Lot นั้น
2. **การเบิกจ่ายสินค้า (Issue):** ระบบจะค้นหา Lot ของสินค้านั้นที่ยังมียอดคงเหลือ (`remainingQuantity > 0`) และเรียงลำดับตามวันที่รับเข้าที่เก่าที่สุดก่อน (`orderBy: { receivedDate: 'asc', id: 'asc' }`)
3. **การตัดยอดหลาย Lot:** หากจำนวนเบิกจ่ายมากกว่ายอดคงเหลือของ Lot แรก ระบบจะตัด Lot แรกจนหมด แล้วนำส่วนที่เหลือไปตัดจาก Lot ถัดไปตามลำดับ พร้อมบันทึกรายละเอียดการกระจาย Lot ลงใน `TransactionLot`
4. **ความถูกต้องในรายงาน:** ในรายงานธุรกรรมและไฟล์ Excel Export จะแสดงรายละเอียดการตัด Lot แต่ละรายการอย่างโปร่งใส

---

## 9. Low Stock Notification & Min Stock Management
- **เกณฑ์ขั้นต่ำ (`minStock`):** Supervisor สามารถกำหนดค่า Min Stock สำหรับบรรจุภัณฑ์แต่ละรายการได้
- **การตรวจจับอัตโนมัติ:** เมื่อมีการยืนยันรายการเบิกจ่าย หรือปรับปรุงยอดสต็อก แล้วทำให้ `quantity <= minStock` ระบบจะสร้างการแจ้งเตือนประเภท `low_stock` ส่งตรงไปยัง Supervisor
- **Duplicate Prevention:** ระบบป้องกันการสร้าง Notification ซ้ำซ้อน หากสินค้านั้นมีแจ้งเตือนที่ยังไม่ได้อ่านอยู่แล้วจะไม่สร้างซ้ำจนกว่าสต็อกจะฟื้นตัวกลับสู่ระดับปกติแล้วลดลงมาใหม่

---

## 10. Scan Stock Validation (ระบบตรวจสอบสต็อกบนหน้าสแกน)
- **Inline Warning:** เมื่อพนักงานเลือกทำรายการ "เบิกออก" แล้วกรอกจำนวนที่ต้องการเบิก ระบบจะตรวจสอบกับยอดสต็อกคงเหลือ ณ ปัจจุบันทันทีแบบ Real-time
- **Submit Guard:** หากจำนวนที่กรอกมากกว่าสต็อกคงเหลือ ระบบจะแสดงกล่องแจ้งเตือนสีแดง และ**ล็อคปุ่มส่งรายการ**ทันที ป้องกันไม่ให้ส่งคำขอที่เกินสต็อกเข้าสู่ฐานข้อมูล

---

## 11. Reports & Excel Export (ระบบรายงานและการส่งออกข้อมูล)
- **ตัวกรองค้นหา:** ค้นหาตามชื่อสินค้า, รหัสสินค้า, ประเภทธุรกรรม (รับเข้า/เบิกออก), สถานะ (Pending/Confirmed/Rejected), หมวดหมู่การเคลื่อนไหว (Normal/Adjustment), และตัวกรองช่วงวันที่ (Date Range: Start Date & End Date)
- **Excel Export (.xlsx):** ส่งออกข้อมูลธุรกรรมเป็นสเปรดชีต Excel โดยจัดรูปแบบหัวตาราง, ข้อมูล Snapshot สินค้า, ข้อมูลผู้ทำรายการ, ข้อมูลผู้อนุมัติ, และรายละเอียดการตัด Lot FIFO อย่างครบถ้วน

---

## 12. Dashboard Architecture (สถาปัตยกรรมหน้าแดชบอร์ด)
ระบบแยกหน้าจอ Dashboard ตามบทบาทของผู้ใช้งานอย่างชัดเจน:
1. **Staff Dashboard (Hybrid Concept):**
   - **สถิติการทำงานของฉัน (Personal Activity):** การ์ด *"คุณรับเข้าวันนี้"*, *"คุณเบิกออกวันนี้"*, *"รายการของคุณที่รอยืนยัน"*, กราฟแท่ง *"สรุปการทำงานของคุณ 7 วันล่าสุด"*, และตาราง *"รายการของคุณล่าสุด"* มุ่งเน้นเฉพาะงานของผู้ล็อกอิน
   - **ภาพรวมคลังสินค้า (Warehouse Overview):** การ์ด *"Packaging ทั้งหมด"*, *"จำนวนคงเหลือรวม"*, *"สต็อกใกล้หมด"*, และกราฟโดนัท *"สัดส่วนประเภท Packaging ในคลัง"* เพื่อให้พนักงานทราบภาพรวมในการจัดเตรียมบรรจุภัณฑ์
2. **Supervisor Dashboard:**
   - นำเสนอในมุมมองระดับคลังสินค้าทั้งหมด (Warehouse-wide Overview): การ์ด *"รับเข้าวันนี้"*, *"เบิกออกวันนี้"*, *"รายการรอยืนยัน"*, กราฟเปรียบเทียบ 7 วันของทั้งคลัง, รายการธุรกรรมล่าสุดของทุกคน, และปุ่มลัดไปยังหน้ารายงาน
3. **Admin Dashboard:**
   - มุ่งเน้นการจัดการผู้ใช้งาน (User Management) แสดงจำนวนผู้ใช้ทั้งหมดและทางลัดไปยังการจัดการบัญชี

---

## 13. Admin User Management
- **การสร้างผู้ใช้งานใหม่:** Admin กรอก Username, Password, ชื่อ-นามสกุล, รหัสพนักงาน (`employeeId`), และกำหนด Role (`admin`, `supervisor`, `warehouse_staff`) โดยบัญชีจะได้รับสถานะ `approved` ทันที
- **การจัดการบัญชี:** Admin สามารถเปิด/ระงับการใช้งานบัญชี (`approved`/`disabled`), เปลี่ยนแปลง Role, รีเซ็ตรหัสผ่านใหม่, และแก้ไขชื่อหรือรหัสพนักงานได้จากหน้าจอเดียว

---

## 14. Authentication & Security Implementation
- **Password Security:** รหัสผ่านของผู้ใช้งานทุกคนถูกเข้ารหัสด้วย `bcryptjs` (Cost factor = 10) ไม่มีรหัสผ่าน Plaintext ในระบบ
- **Token Security:** ใช้ JWT Token อายุ 24 ชั่วโมง แนบใน Authorization Header รูปแบบ `Bearer <token>`
- **Removal of Fallback Accounts (STEP 4.32):**
  - ลบ Hardcoded fast-path credentials (`admin123`, `super1234`, `staff123`) และ Mock User Objects ใน Backend Source Code ออก 100%
  - การล็อกอินทั้งหมดวิ่งผ่าน `prisma.user.findFirst` และเปรียบเทียบ hash ด้วย `bcrypt.compare` กับฐานข้อมูลจริงเท่านั้น
  - หากฐานข้อมูลขัดข้อง ระบบจะส่ง HTTP 500 ปฏิเสธการเข้าใช้งาน โดยไม่มีการออก Token จำลองเด็ดขาด
- **Removal of `fallbackUsersCache`:** ลบ In-memory cache ออกทั้งหมด ป้องกันการเก็บ Plaintext Password ในหน่วยความจำ

---

## 15. Cross-Origin Resource Sharing (CORS) Security
- **Strict Whitelist Matching:** ตรวจสอบ Origin ของ Request เทียบกับค่า Whitelist ใน `process.env.CORS_ORIGIN` แบบ Exact Match เท่านั้น
- **Anti-Bypass:** ลบ Logic Substring Matching เช่น `includes('vercel.app')` และ `includes('localhost')` ออกทั้งหมด ป้องกันโดเมนแปลกปลอมปลอมตัวเป็น Vercel หรือ Localhost
- **Header Emission:** หาก Origin ไม่อยู่ใน Whitelist ระบบจะไม่ส่ง Header `Access-Control-Allow-Origin` กลับไป

---

## 16. Testing & Quality Verification Summary
ผลการทดสอบระบบแบบอัตโนมัติใน STEP 4.33 ยืนยันความสมบูรณ์ 100%:

| ชุดทดสอบ (Test Suite) | จำนวนที่ผ่าน / ทั้งหมด | สถานะ | รายละเอียด |
|---|---|---|---|
| **Backend Integration & Unit Tests** | **79 / 79** | **PASS** | ครอบคลุม Excel Export (13), API & Security Hardening (46), Low Stock (20) |
| **Frontend Unit & Component Tests** | **80 / 80** | **PASS** | ครอบคลุม Auth, BOM, Lifecycle, Low Stock, Dashboard, Scan Validation, Reports |
| **Backend TypeScript Check** | 0 Errors | **PASS** | คอมไพล์ผ่านสมบูรณ์ ปราศจาก `any` ตาม Rule 1 |
| **Frontend TypeScript Check** | 0 Errors | **PASS** | คอมไพล์ผ่านสมบูรณ์ ปราศจาก `any` ตาม Rule 1 |
| **Production Build (Next.js)** | 12 / 12 Pages | **PASS** | สร้าง Static Pages ครบ 12 หน้าสำเร็จ ไร้ข้อผิดพลาด |
| **Browser / UI Verification** | 3 / 3 Roles | **PASS** | ทดสอบการทำงานจริงบน Browser ครบทั้ง Staff, Supervisor, และ Admin |

---

## 17. Requirement & Feature Status Matrix

| ข้อกำหนด / ฟีเจอร์ (Requirement / Feature) | สถานะ | คำอธิบาย | ข้อจำกัด / หมายเหตุ |
|---|---|---|---|
| **Authentication (Login/Logout/JWT)** | **PASS** | เข้ารหัสด้วย Bcrypt, JWT Token 24 ชม., ตรวจสอบผ่าน DB จริง 100% | ถอด Hardcoded Fallbacks ออกทั้งหมดแล้ว |
| **Admin User Management** | **PASS** | สร้างผู้ใช้, กำหนด Role, เปิด/ระงับบัญชี, รีเซ็ตรหัสผ่าน | Admin เป็นผู้สร้างบัญชีพนักงานโดยตรง |
| **Role-Based Access Control (RBAC)** | **PASS** | แบ่งแยก 3 บทบาท (`admin`, `supervisor`, `warehouse_staff`) | มี Middleware ตรวจสอบทั้ง Backend และ Frontend |
| **QR Code Scan (Receive / Issue)** | **PASS** | บันทึกธุรกรรมรับเข้าและเบิกจ่ายพร้อม Snapshot ข้อมูล | ข้อมูลบันทึกแบบ Real-time |
| **Inline Stock Validation on Scan** | **PASS** | แจ้งเตือนทันทีเมื่อกรอกเบิกเกินสต็อก และล็อคปุ่มส่งรายการ | ป้องกันยอดติดลบตั้งแต่ต้นทาง |
| **FIFO Stock Allocation** | **PASS** | ตัดสต็อกตามอายุ Lot ที่เก่าที่สุดก่อนเสมอ | บันทึกรายละเอียดการตัด Lot ชัดเจน |
| **Supervisor Transaction Approval** | **PASS** | หัวหน้างานตรวจสอบและอนุมัติหรือปฏิเสธรายการเบิกจ่าย | มีผลต่อสต็อกจริงเมื่อกดยืนยันแล้วเท่านั้น |
| **Low Stock Notification** | **PASS** | แจ้งเตือนเมื่อสต็อก Packaging ต่ำกว่าหรือเท่ากับ Min Stock | ป้องกันการแจ้งเตือนซ้ำซ้อน |
| **Packaging & BOM Mapping** | **PASS** | เชื่อมโยงสูตรการผลิตระหว่างสินค้าสำเร็จรูปกับบรรจุภัณฑ์ | รองรับโครงสร้างความสัมพันธ์แบบ 1:N |
| **Reports & Filtering** | **PASS** | ค้นหา, กรองสถานะ, กรองประเภท, กรองช่วงวันที่ Date Range | ข้อมูลสอดคล้องกับสิทธิ์ของผู้ใช้งาน |
| **Excel Export (.xlsx)** | **PASS** | ส่งออกไฟล์ Excel พร้อมรายละเอียด Lot FIFO ตามช่วงวันที่ | สงวนสิทธิ์เฉพาะ Supervisor |
| **Staff Dashboard (Hybrid Concept)** | **PASS** | แยก "สถิติการทำงานของฉัน" และ "ภาพรวมคลังสินค้า" | Staff เห็นเฉพาะรายการของตนเอง |
| **Supervisor Dashboard** | **PASS** | แสดงภาพรวมกิจกรรมธุรกรรมของทั้งคลังสินค้า | เชื่อมโยงไปยังหน้ารายงานและสต็อก |
| **Security Hardening (No Fallback)** | **PASS** | ไม่มี Mock Account หรือ Fast-path Login ในโค้ด | ปฏิเสธการล็อกอินเมื่อ DB ขัดข้อง |
| **Strict CORS Whitelist** | **PASS** | บังคับ Exact Match กับ Whitelist ใน Environment Variable | ตัด Substring Matching ที่ไม่ปลอดภัยออก |
| **GAP-001 (Work Instruction PDF)** | **PENDING** | ปุ่มลิงก์ไปยัง `/docs/work-instruction.pdf` ในหน้าแรก | **รอไฟล์เอกสาร PDF ตัวจริงจากผู้ใช้** |
| **GAP-003 (Pending Registration Workflow)** | **TECHNICAL DEBT** | Endpoints เดิมสำหรับการอนุมัติผู้ใช้สมัครสาธารณะ | ปิดรับสมัครสาธารณะแล้วโดยตั้งใจ |
| **Batch Item Scanning** | **FUTURE ENHANCEMENT** | การสแกนบาร์โค้ดสินค้าหลายรายการพร้อมกัน | ไม่อยู่ใน Requirement ปัจจุบัน |
| **Physical Stock Take / Cycle Count** | **FUTURE ENHANCEMENT** | ระบบตรวจนับยอดสต็อกจริงประจำงวดเพื่อกระทบยอด | ไม่อยู่ใน Requirement ปัจจุบัน |
| **PDF Report Export** | **FUTURE ENHANCEMENT** | การส่งออกรายงานในรูปแบบเอกสาร PDF | ปัจจุบันส่งออกเป็น Excel (.xlsx) ครบถ้วน |

---

## 18. Known Findings & Technical Debt
1. **FINDING-001 (GAP-001): รอไฟล์เอกสาร Work Instruction ฉบับจริง**
   - **ระดับความรุนแรง:** P3 (Low / Pending User File)
   - **รายละเอียด:** ในหน้าแรก (`QuickGuideCarousel.tsx`) มีปุ่มดาวน์โหลดเอกสารคู่มือการปฏิบัติงานแบบละเอียด (`work-instruction.pdf`) แต่ในไดเรกทอรี `frontend/public/docs/` ยังไม่มีไฟล์ตัวจริงจากองค์กร (มีเฉพาะ `quick-guide.pdf`)
   - **แนวทางจัดการ:** รอผู้ใช้นำไฟล์ PDF ตัวจริงมาใส่ในระบบเมื่อพร้อม
2. **FINDING-002: คำเตือน ESLint เรื่อง setState-in-effect ใน React 19**
   - **ระดับความรุนแรง:** INFO (Technical Debt)
   - **รายละเอียด:** พบคำเตือน ESLint กฎ `react-hooks/set-state-in-effect` ใน `frontend/app/users/page.tsx` และ `frontend/components/Navigation.tsx`
   - **แนวทางจัดการ:** ปรับปรุงโครงสร้าง State Initialization ในรอบการบำรุงรักษาโค้ดภายหลัง โดยคำเตือนนี้ไม่มีผลกระทบต่อ Production Build
3. **FINDING-003 (GAP-003): Legacy User Endpoints ที่ไม่ได้ใช้งาน**
   - **ระดับความรุนแรง:** INFO (Technical Debt)
   - **รายละเอียด:** มี Endpoints `GET /users/pending`, `POST /users/:id/approve`, `POST /users/:id/reject` ตกค้างใน Backend จากระบบเดิมที่เคยเปิดรับสมัครสมาชิกสาธารณะ
   - **แนวทางจัดการ:** Endpoints เหล่านี้ได้รับการคุ้มครองด้วยสิทธิ์ `requireRole('admin')` จึงปลอดภัย สามารถพิจารณาลบออกในรอบ Code Cleanup ในอนาคต

---

## 19. Production Deployment Notes (ข้อกำหนดในการนำระบบขึ้น Production)

ก่อนนำระบบขึ้น Production Server จริง ผู้ดูแลระบบต้องกำหนดค่า Environment Variables ต่อไปนี้:

| ตัวแปร (Environment Variable) | ตำแหน่ง | หน้าที่และข้อกำหนด |
|---|---|---|
| `DATABASE_URL` | Backend | URL การเชื่อมต่อฐานข้อมูล PostgreSQL ผ่าน Supabase Transaction Pooler (พอร์ต 6543) |
| `DIRECT_URL` | Backend | URL การเชื่อมต่อฐานข้อมูล PostgreSQL โดยตรง (พอร์ต 5432) สำหรับการทำ Migration |
| `JWT_SECRET` | Backend | **ต้องระบุ:** สตริงรหัสลับที่มีความยาวและความซับซ้อนสูง (ห้ามใช้ค่า default) |
| `CORS_ORIGIN` | Backend | **ต้องระบุ:** โดเมนของ Frontend แบบเป๊ะ ๆ เช่น `https://mms.example.com` (รองรับ Comma-separated) |
| `PORT` | Backend | พอร์ตที่ Backend ให้บริการ (ค่าเริ่มต้น: 4000) |
| `NODE_ENV` | Backend | ต้องตั้งค่าเป็น `production` เพื่อเปิดใช้งาน Production Security Guards ทั้งหมด |
| `NEXT_PUBLIC_API_URL` | Frontend | URL ฐานของ Backend API เช่น `https://api-mms.example.com` |

---

## 20. Git System Baseline Confirmation
- **Branch:** `main`
- **Current HEAD Commit:** `43fa3b005c9190318ce3b3973f6f246e845bf08a`
- **Synchronized with:** `origin/main`
- **Commit Subject:** `chore: finalize system baseline and stock ui`
- **Working Tree Status:** Clean (ก่อนเริ่มและหลังจัดทำเอกสาร)
