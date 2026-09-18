# บันทึกการทำงาน (Memories)

## 18 ก.ย. 2026
- **ดำเนินการเพิ่มชุดทดสอบ GAP-003: ตรวจสอบสิทธิ์ RBAC ของ Staff ในการสร้าง BOM (Staff Cannot Create BOM -> 403 Forbidden) (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: เพิ่ม Automated Test Case สำหรับปิดช่องว่างการทดสอบ (Test Gap) ในส่วนของ RBAC Boundary เพื่อยืนยันว่าผู้ใช้งานบทบาท `warehouse_staff` (Staff) ไม่มีสิทธิ์สร้างโครงสร้างสูตรสินค้า BOM และเมื่อเรียก API `POST /products/with-bom` โดยตรง ระบบจะปฏิเสธด้วย HTTP 403 Forbidden เสมอ
  - **รายละเอียดการดำเนินการ**:
    1. ตรวจสอบ Route `POST /products/with-bom` ใน [`backend/src/index.ts`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts) ยืนยันว่าถูกป้องกันด้วย Middleware `authenticate` และ `requireRole('supervisor')` อย่างถูกต้อง
    2. เพิ่ม Test Case `Staff cannot create BOM and receives 403 Forbidden` ใน [`backend/__tests__/api.test.ts`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/__tests__/api.test.ts):
       - ใช้ Synthetic JWT สำหรับ Role `warehouse_staff`
       - ส่ง Valid Payload สำหรับการสร้าง Product พร้อม BOM Components
       - ตรวจสอบว่าระบบตอบกลับ HTTP 403 Forbidden พร้อม Error message ชัดเจน
       - ตรวจสอบยืนยันระดับฐานข้อมูลว่าไม่มีการสร้างข้อมูลในตาราง `BillOfMaterial` หรือ `Product`
       - มีกระบวนการ Defensive Cleanup ข้อมูลทดสอบในบล็อก `finally`
    3. ไม่มีการแก้ไข Business Logic, สิทธิ์ RBAC, Database Schema, หรือ Production Data ใดๆ ทั้งสิ้น
  - **ผลการทดสอบและการตรวจสอบคุณภาพ**:
    - Backend Vitest: ผ่านครบถ้วน **106/106 tests (6/6 suites) PASS**
    - Frontend Vitest: ผ่านครบถ้วน **104/104 tests (9/9 suites) PASS**
    - Playwright E2E: ผ่านครบถ้วน **18/18 tests PASS**
    - TypeScript Check (Frontend & Backend): ผ่านสมบูรณ์ **0 errors**
    - Production Build (Frontend & Backend): ผ่านสมบูรณ์ **0 errors**

- **ดำเนินการแก้ไข BUG-OBS-001: แก้ไข Outer Catch Handler ให้ส่งกลับ HTTP 409 สำหรับกรณีสต็อกไม่เพียงพอใน Transaction Confirmation (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: แก้ไขข้อผิดพลาด BUG-OBS-001 ที่ตรวจพบระหว่างการทดสอบ Concurrency Test ของกระบวนการยืนยันรายการเบิกสินค้า (`POST /transactions/:id/confirm`) โดยโค้ดภายใน Transaction ได้ตรวจสอบสต็อกและโยน Error พร้อมแนบ `statusCode = 409` ไว้อย่างถูกต้องแล้ว แต่ Outer Catch Handler เดิมละเลย `error.statusCode` และแปลงเป็น HTTP 500 (Internal Server Error) เสมอ ทำให้ความขัดแย้งทางธุรกิจ (Business Conflict / Insufficient Stock) ถูกรายงานผิดพลาดเป็นข้อผิดพลาดของเซิร์ฟเวอร์
  - **รายละเอียดการแก้ไข**:
    1. ปรับปรุง Outer Catch Block ใน [`backend/src/index.ts`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts) ที่ Route `POST /transactions/:id/confirm`: ตรวจสอบหาก Error มี property `statusCode` ที่เป็นตัวเลขในช่วง Client Error (400 - 499) ให้ส่งกลับค่านั้นพร้อมข้อความแจ้งเตือนเดิม เช่น `'สต็อกใน Lot ไม่เพียงพอสำหรับการเบิก'` ในรูปแบบ JSON `{ error: message }` ตามเดิม
    2. สำหรับ Error อื่นๆ หรือ Unexpected Database/Server Error ยังคงส่งกลับ HTTP 500 (`'Internal server error'`) เพื่อความปลอดภัย
    3. ปฏิบัติตามกฎอย่างเคร่งครัด: ไม่ใช้ `any`, ใช้ Type Guard และ Type Narrowing อย่างรัดกุม, ไม่แก้ไข FIFO Logic, ไม่แก้ไข Database Schema, Migration หรือ Production Data
  - **การทดสอบและการตรวจสอบคุณภาพ**:
    - เพิ่มและปรับปรุง Automated Regression Tests ใน [`backend/__tests__/concurrency-rollback.test.ts`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/__tests__/concurrency-rollback.test.ts):
      - TEST A: ตรวจสอบการยืนยันเบิกสินค้าเกินสต็อกได้รับ HTTP 409 พร้อมข้อความภาษาไทยเดิม และสต็อก/สถานะ pending ไม่เปลี่ยนแปลง (PASS)
      - TEST B: ตรวจสอบกรณีเกิด Unexpected Database Failure ภายใน `$transaction` ได้รับ HTTP 500 และเกิด Rollback สมบูรณ์ (PASS)
      - TEST C: ตรวจสอบ Concurrent Confirmation กำหนดให้รายการที่แพ้ต้องได้รับ HTTP 409 อย่างเข้มงวด (PASS)
    - Backend Vitest: ผ่านครบถ้วน **105/105 tests (6/6 suites) PASS**
    - Frontend Vitest: ผ่านครบถ้วน **104/104 tests (9/9 suites) PASS**
    - Playwright E2E: ผ่านครบถ้วน **18/18 tests PASS**
    - TypeScript Check (Frontend & Backend): ผ่านสมบูรณ์ **0 errors**
    - Production Build (Frontend & Backend): ผ่านสมบูรณ์ **0 errors**

- **ดำเนินการแก้ไข BUG-005: ลบ Legacy User Management APIs และ Wrapper Functions ที่ไม่ได้ใช้งาน (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: แก้ไขปัญหา Technical Debt (BUG-005) ตามผลการสอบสวนที่ได้รับการอนุมัติ โดยลบ Legacy User Endpoints ที่ตกค้างใน Backend จากระบบสมัครสมาชิกเดิมที่ปิดตัวไปแล้ว (`GET /users/pending`, `POST /users/:id/approve`, `POST /users/:id/reject`) และ Wrapper Functions ที่ไม่มีการเรียกใช้ใน Frontend (`getPendingUsers`, `approveUser`, `rejectUser`) เพื่อลดภาระการบำรุงรักษาโค้ดและทำให้ API Surface สะอาด ปลอดภัย
  - **รายละเอียดการแก้ไข**:
    1. ลบ Route Handlers ใน [`backend/src/index.ts`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts): `GET /users/pending`, `POST /users/:id/approve`, และ `POST /users/:id/reject`
    2. ลบ Unused Wrapper Functions ใน [`frontend/lib/auth.ts`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/lib/auth.ts): `getPendingUsers`, `approveUser`, และ `rejectUser`
    3. คงฟังก์ชันและ Endpoints ของระบบ User Management ปัจจุบันไว้ครบถ้วน 100% (`POST /users`, `GET /users`, `PATCH /users/:id/status`, `PATCH /users/:id/role`, `PATCH /users/:id/reset-password`, `DELETE /users/:id`) โดยไม่มีการเปลี่ยน Database Schema, Migration, หรือ Business Logic
  - **ผลการทดสอบและการตรวจสอบคุณภาพ**:
    - Backend Vitest: ผ่านครบถ้วน **102/102 tests (5/5 suites) PASS**
    - Frontend Vitest: ผ่านครบถ้วน **104/104 tests (9/9 suites) PASS**
    - Playwright E2E: ผ่านครบถ้วน **18/18 tests PASS**
    - TypeScript Check (Frontend & Backend): ผ่านสมบูรณ์ **0 errors**
    - Production Build (Frontend & Backend): ผ่านสมบูรณ์ **0 errors**

- **ดำเนินการแก้ไข BUG-004: แก้ไข ESLint Warning react-hooks/set-state-in-effect ในหน้า Scan (`frontend/app/scan/page.tsx:31`) (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: แก้ไขข้อผิดพลาด BUG-004 ในหน้า `frontend/app/scan/page.tsx` ที่มีการเรียก `setUser(JSON.parse(userStr))` ภายใน `useEffect` และใช้คอมเมนต์ `// eslint-disable-next-line react-hooks/set-state-in-effect` ในการ suppress warning ซึ่งก่อให้เกิด Cascading Render (Render รอบแรกเป็น null และ Render ทันทีอีกรอบหลัง mount)
  - **รายละเอียดการแก้ไข**:
    1. เปลี่ยนกระบวนการอ่านข้อมูล `user` จาก `localStorage` มาใช้ React 18/19 Standard API คือ `useSyncExternalStore` ร่วมกับ `useMemo`
    2. สร้างฟังก์ชัน `subscribeToStorage`, `getUserSnapshot` และ `getServerSnapshot` เพื่ออ่าน snapshot อย่างเป็นทางการ
    3. ลบคอมเมนต์ `// eslint-disable-next-line react-hooks/set-state-in-effect` ออกอย่างสมบูรณ์ และแก้ปัญหาที่ Root Cause โดยตรง
    4. ป้องกันปัญหา Hydration Mismatch และไม่ก่อให้เกิด Cascading Render เพิ่มเติม โดยคง Type (`{ username?: string; fullName: string } | null`) และการแสดงผลชื่อผู้ใช้บน UI ไว้เหมือนเดิม 100%
  - **ผลการทดสอบและการตรวจสอบคุณภาพ**:
    - ESLint Check: `npx eslint app/scan/page.tsx` ผ่านสมบูรณ์ ปราศจาก `set-state-in-effect` warning
    - Frontend TypeScript: `npx tsc --noEmit` ผ่านสมบูรณ์ **0 errors**
    - Frontend Production Build: `npm run build` ผ่านสมบูรณ์ (Compiled in 4.8s, Generating static pages 12/12)
    - Frontend Vitest: ผ่านครบถ้วน **104/104 tests (9/9 suites) PASS**
    - Playwright E2E: ผ่านครบถ้วน **18/18 tests PASS**
    - ไม่มีผลกระทบต่อ Scan behavior, Validation, FIFO, หรือระบบ Authentication/RBAC

## 17 ก.ย. 2026
- **ดำเนินการแก้ไข BUG-003: ปรับปรุงความเสถียรของการ Build ฟอนต์ใน Frontend โดยเปลี่ยนมาใช้ Local Fonts (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: แก้ไขข้อผิดพลาด BUG-003 ที่การ Build ฝั่ง Frontend เดิมพึ่งพา `next/font/google` ซึ่งจำเป็นต้องดาวน์โหลดฟอนต์ผ่านเครือข่ายภายนอก (Google Fonts CDN) ในขณะ Build ทำให้เสี่ยงต่อการ Build ล้มเหลวเมื่ออยู่ในสภาพแวดล้อมที่ไม่มีอินเทอร์เน็ต, ติด Proxy, หรือ Google Fonts ไม่สามารถเข้าถึงได้
  - **รายละเอียดการแก้ไข**:
    1. นำเข้าไฟล์ฟอนต์มาตรฐานของแท้ (`.woff2`) สำหรับทั้ง **Prompt** (รองรับทั้งภาษาไทยและอังกฤษ ครอบคลุม Weights: 300, 400, 500, 600, 700, 800) และ **Inter** (Latin / Latin-Ext) มาจัดเก็บไว้ภายในโปรเจกต์ที่โฟลเดอร์ `frontend/app/fonts/`
    2. ปรับปรุง [`frontend/app/layout.tsx`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/layout.tsx): เปลี่ยนจากการนำเข้า `next/font/google` มาใช้ `next/font/local` (`localFont`) โดยยังคงชื่อ CSS Variables เดิม (`--font-inter` และ `--font-prompt-sans`) และคงสัดส่วน Typography Hierarchy และ Weights ทั้งหมดไว้ 100%
    3. ไม่ต้องพึ่งพา Third-party Library เพิ่มเติม และตัดการเชื่อมต่อเครือข่ายภายนอกสำหรับฟอนต์ในขั้นตอน Build ได้ 100%
  - **ผลการทดสอบและการตรวจสอบคุณภาพ**:
    - Frontend TypeScript Check: `npx tsc --noEmit` ผ่านสมบูรณ์ **0 errors**
    - Frontend Production Build: `npm run build` ผ่านสมบูรณ์ (Compiled in 2.6s, Generating static pages 12/12)
    - Offline / Network-restricted Build Simulation: ทดสอบ Build ผ่านการตั้งค่า Dead Proxy ปิดกั้นเครือข่ายภายนอก ผลการ Build สำเร็จสมบูรณ์ 100% ปราศจากการดึงข้อมูลภายนอก
    - Frontend Vitest: ผ่านครบถ้วน **104/104 tests (9/9 suites) PASS**
    - Playwright E2E: ผ่านครบถ้วน **18/18 tests PASS**
    - Backend Vitest: ผ่านครบถ้วน **102/102 tests (5/5 suites) PASS**
    - Backend TypeScript: ผ่านสมบูรณ์ **0 errors**
    - Backend Build: ผ่านสมบูรณ์ **0 errors**
    - Visual & Typography Verification: ตรวจสอบหน้าจอด้วย Browser Agent ยืนยันการแสดงผลฟอนต์ภาษาไทยและอังกฤษคมชัด สวยงาม ไม่มี Layout Shift และไม่มี Console Error

- **ดำเนินการแก้ไข BUG-002: ปรับปรุง Test Fixture / Test Authentication ใน Backend Vitest Suite (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: แก้ไขข้อผิดพลาดของชุดทดสอบ Backend Integration Tests ที่ล้มเหลวเนื่องจากพยายามเข้าสู่ระบบด้วยบัญชี Hardcoded/Fallback เก่าที่ถูกถอดออกจากระบบจริงแล้ว (`staff/staff123`, `admin/admin123`) โดยปรับปรุงให้ชุดทดสอบมีความเป็นอิสระ ปลอดภัย และอ้างอิงกระบวนการ Authentication/Authorization (JWT & RBAC) จริงของระบบ โดยไม่มีการคืนชีพบัญชี fallback หรือแก้ไขโค้ดการทำงานหลักใน Production
  - **รายละเอียดการแก้ไข (Test Fixtures Remediation)**:
    1. [`backend/__tests__/export-excel.test.ts`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/__tests__/export-excel.test.ts): เปลี่ยนจากการเรียก `POST /auth/login` ด้วย `staff123` มาเป็นการสร้าง Synthetic JWT Token (`makeToken({ userId, username, role })`) ที่ลงลายมือชื่อด้วย `JWT_SECRET` จริงตามสิทธิ์ที่ต้องการทดสอบ (Supervisor / Staff / Admin) ผลการทดสอบ **13/13 tests PASS (100%)**
    2. [`backend/__tests__/low-stock.test.ts`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/__tests__/low-stock.test.ts): สร้าง Isolated Temporary Test Users (`test-staff-ls-*`, `test-sup-ls-*`, `test-admin-ls-*`) ใน `beforeAll` เพื่อรองรับเงื่อนไข Foreign Key `Transaction.createdById` ในตารางฐานข้อมูล และทำความสะอาดข้อมูลทดสอบ (Transactions, ProductLots, Products, Notifications, Users) อย่างหมดจดใน `afterAll` ผลการทดสอบ **20/20 tests PASS (100%)**
    3. [`backend/__tests__/api.test.ts`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/__tests__/api.test.ts): สร้าง Dynamic Isolated Test Users และ Synthetic Tokens ครอบคลุม Section 1-4 (Product Lifecycle, Status Guards, Role Boundaries, Staff CreatedById Filter) และปรับปรุงข้อความตรวจสอบ Error Guard ของ `DELETE /products/:id` (`มีประวัติ Lot บรรจุภัณฑ์`, `ผูกอยู่ในสูตรโครงสร้าง BOM`) ให้สอดคล้องกับ Implementation จริง ผลการทดสอบ **43/43 tests PASS (100%)**
  - **ผลการทดสอบและการตรวจสอบคุณภาพ (Quality & Automated Verification)**:
    - Backend Vitest Suite: ผ่านครบถ้วน **102/102 tests (5/5 suites) PASS (100%, 0 failures)**
    - Backend TypeScript Check: `npx tsc --noEmit` ผ่านสมบูรณ์ **0 errors** ปราศจาก `any` ตาม Rule 1
    - Backend Build: `npx tsc` ผ่านสมบูรณ์ **0 errors**
    - Frontend Vitest Suite: ผ่านครบถ้วน **104/104 tests (9/9 suites) PASS (100%)**
    - Frontend TypeScript Check: `npx tsc --noEmit` ผ่านสมบูรณ์ **0 errors**
    - Playwright E2E Tests: ผ่านครบถ้วน **18/18 tests PASS (100%)**
    - Security Regression Check: ยืนยันไม่มี Fallback Users, ไม่มี Fast-path Password, ไม่มี Memory Mode และไม่มี Auth Bypass ใน Production Source Code
    - ไม่มีการแก้ไข Production Source Code ใน `backend/src/index.ts`, ไม่มีการแก้ไข Database Schema และไม่มีการรัน Migration ใดๆ

- **ดำเนินการแก้ไข BUG-001: ถอด Legacy "Memory Mode" False Success ใน Admin User Management API (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: แก้ไขข้อผิดพลาดเชิงโครงสร้างในระบบจัดการผู้ใช้งาน (Admin User Management) ใน `backend/src/index.ts` ซึ่งเดิมมี inner try/catch ที่จับข้อผิดพลาดของฐานข้อมูล/Prisma (เช่น User ID ไม่มีอยู่จริง หรือข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล) แล้วตอบกลับเป็น HTTP 200 พร้อมข้อความ `(Memory Mode)` และ `success: true` ทำให้เกิด False Success ที่หลอกหน้าจอ Admin
  - **รายละเอียดการแก้ไข (5 Endpoints ใน backend/src/index.ts)**:
    1. `PATCH /users/:id/role`: ตรวจสอบการมีอยู่ของผู้ใช้ (`findUnique`) หากไม่พบส่งคืน HTTP 404 (Not Found), หาก Role ไม่ถูกต้องส่งคืน HTTP 400 (Bad Request), หากสำเร็จปรับปรุงสิทธิ์ในฐานข้อมูลจริงและส่งคืน HTTP 200 (OK), และหาก DB ขัดข้องส่งคืน HTTP 500 (Internal Server Error)
    2. `PATCH /users/:id/reset-password`: ตรวจสอบความยาวรหัสผ่าน (>= 6 ตัวอักษร), ตรวจสอบการมีอยู่ของผู้ใช้ หากไม่พบส่งคืน HTTP 404, หากสำเร็จทำการเข้ารหัส Hash ใหม่ด้วย Bcryptjs และบันทึกลงฐานข้อมูลจริง
    3. `PATCH /users/:id`: ตรวจสอบความครบถ้วนของชื่อ-นามสกุล, ตรวจสอบการมีอยู่ของผู้ใช้ หากไม่พบส่งคืน HTTP 404, หากสำเร็จปรับปรุงข้อมูลในฐานข้อมูลจริง
    4. `PATCH /users/:id/status`: ตรวจสอบค่าสถานะ (`approved` / `disabled`), ตรวจสอบการมีอยู่ของผู้ใช้ หากไม่พบส่งคืน HTTP 404, หากสำเร็จปรับปรุงสถานะจริงในฐานข้อมูล
    5. `DELETE /users/:id`: ตรวจสอบการมีอยู่ของผู้ใช้ หากไม่พบส่งคืน HTTP 404, เพิ่ม Guard ป้องกันการลบผู้ใช้ที่มีประวัติการทำรายการ (Transaction) โดยส่งคืน HTTP 409 (Conflict), ลบการแจ้งเตือนที่เกี่ยวข้องก่อนลบ และลบผู้ใช้ออกจากฐานข้อมูลจริง
  - **การทดสอบและการตรวจสอบคุณภาพ (Quality & Automated Verification)**:
    - สร้างชุดทดสอบ Vitest ใน [`backend/__tests__/user-management.test.ts`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/__tests__/user-management.test.ts) ครอบคลุมทั้ง 16 Test Cases (ตรวจสอบ HTTP 404 เมื่อ User ID ไม่มีอยู่จริง, ตรวจสอบ HTTP 400 Validation, ตรวจสอบ HTTP 403 เมื่อ Staff เรียกใช้, ตรวจสอบ HTTP 409 Foreign Key Guard เมื่อลบผู้ใช้ที่มี Transaction, ตรวจสอบความสำเร็จเมื่อแก้ไขจริง และยืนยันว่าไม่มีข้อความ `Memory Mode` หรือ False Success หลงเหลือ) ผลการทดสอบ **16/16 PASS (100%)**
    - TypeScript Type Check: 0 errors ทั้ง Frontend และ Backend (`npx tsc --noEmit`) ปราศจาก `any` 100% ตาม Rule 1
    - Backend Compilation (`npx tsc`): ผ่านสมบูรณ์ 0 errors
    - Frontend Vitest: ผ่านครบถ้วน **104/104 tests (9/9 suites) PASS (100%)**
    - Playwright E2E Tests: ผ่านครบถ้วน **18/18 tests PASS (100%)**
    - ไม่มีการแตะต้อง Logic ส่วนอื่น (FIFO, ProductLot, Stock, Scan, Transaction, Reports, Notifications คงเดิม 100%)

## 16 ก.ย. 2026
- **ดำเนินการปรับปรุง UI/Visual Design ของหน้า Dashboard สำหรับ Role Supervisor (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ปรับปรุงการออกแบบเชิงทัศนียภาพ (Visual Redesign) และลำดับขั้นการมองเห็น (Visual Hierarchy) ของหน้า Dashboard สำหรับบทบาท Supervisor ตามแนวทางอ้างอิง Reference Design โดยเน้นความเป็นมืออาชีพ เรียบง่าย สะอาดตา (Minimal, Clean, Professional WMS) และอ่านค่าง่าย โดยไม่แตะต้อง Business Logic, Database Schema, API, หรือการคำนวณข้อมูลจริงของระบบ
  - **รายละเอียดการปรับปรุง (Key Design Implementations)**:
    1. **Typography & Font Family**: ปรับฟอนต์ของหน้า Dashboard Supervisor ให้ใช้ Google Font **Prompt** (`font-display`) สอดคล้องเป็นหนึ่งเดียวกับแถบเมนูนำทาง (Sidebar Navigation) ทั้งตัวเลข หัวข้อ และคำอธิบาย
    2. **Layout 4 KPI Cards (Horizontal Layout with Left Icon & Single-line Metrics)**: ปรับโครงสร้างภายใน 4 Cards ให้ตรงตามภาพต้นแบบ โดยไอคอนจัดวางอยู่ฝั่งซ้าย (`w-12 h-12 rounded-2xl shrink-0`) และข้อมูลจัดวางอยู่ฝั่งขวา (Label ด้านบน $\rightarrow$ ตัวเลขขนาดใหญ่และหน่วยนับ `ชิ้น / หน่วย` หรือ `รายการ` อยู่ในบรรทัดเดียวกันอย่างสมบูรณ์แบบด้วย `flex-nowrap whitespace-nowrap` $\rightarrow$ คำอธิบายย่อย/ลิงก์ด้านล่าง)
    3. **Inbound / Outbound 7-Day Grouped Bar Chart (2/3 Width)**: พัฒนากราฟเปรียบเทียบการรับเข้า (Crimson Red `#B91C1C`) และการเบิกออก (Coral Pink `#FB7185`) แท่งคู่ในแต่ละวัน พร้อม Dynamic Y-Axis scale, ค่าตัวเลขบนแท่งกราฟ, Badge ช่วงเวลา 7 วัน (`"10 ก.ย. 2569 - 16 ก.ย. 2569"`), และกล่องสรุปรวม 7 วันด้านล่างพร้อมเปอร์เซ็นต์เปรียบเทียบ
    4. **Donut Chart สัดส่วนวัตถุดิบบรรจุภัณฑ์ (1/3 Width)**: แสดง Donut Chart ขนาด 180x180 px พร้อมตัวเลขรวมกึ่งกลางวงแหวน (`รวม / 23 / รายการ`) และรายการ Category List ด้านขวาแสดงจุดสี, ชื่อหมวดหมู่, จำนวน และร้อยละ (%) อย่างเป็นระเบียบ
    5. **Action Required Section**: ปรับลดน้ำหนักสายตาลงจาก Chart โดยแสดงกล่องสถานะเรียบร้อยสีเขียวอ่อน (`bg-emerald-50/50 border-emerald-100`) พร้อม Badge `สถานะเรียบร้อย` หรือคิวรออนุมัติหากมีรายการค้าง
    6. **Supervisor Quick Actions**: จัดวางเป็น 4 Horizontal Cards สวยงาม (ตรวจสอบรายการ, ดูสต็อกบรรจุภัณฑ์, ธุรกรรมทั้งหมด, ดูรายงานทั้งหมด) พร้อมไอคอนกำกับและลูกศรนำทาง
    7. **Recent Transactions Table & Transactions Page (No Highlight Badges)**: ปรับตารางรายการล่าสุดและหน้ารายการธุรกรรม (Transactions Page) โดยยกเลิกการใช้กล่องไฮไลท์พื้นหลัง (Un-highlighted Clean Text) บนคำว่า `รับเข้า`, `เบิกออก`, `ยืนยันแล้ว`, `ปฏิเสธ` / `ปฏิเสธแล้ว`, `รอการยืนยัน` เพื่อให้หน้าจอเป็นระเบียบ เรียบง่าย และสะอาดตาสูงสุด
    8. **Quality & Regression Testing**: ผ่าน TypeScript (`npx tsc --noEmit` 0 errors), Vitest Unit Tests ใน Frontend ผ่านครบถ้วน 100% (9/9 test files, 104/104 tests PASS)

- **ดำเนินการ STEP 16.1: FINAL UAT SIGN-OFF DOCUMENT REVIEW & PREPARATION บน Production (เสร็จสมบูรณ์ 100% - PASS / READY FOR SIGN-OFF)**:
  - **เหตุผลและเป้าหมาย**: ดำเนินการตรวจสอบและจัดเตรียมเอกสารสรุปผลการยอมรับของผู้ใช้ขั้นสุดท้าย (Final UAT Sign-off Document Preparation) แบบ Read-Only อ้างอิงตามหลักฐานการทดสอบ UAT จริงบน Production อย่างเคร่งครัด โดยตรวจสอบความถูกต้องของข้อมูลทุกจุด (Transaction IDs, Product IDs, ProductLots, FIFO Allocation, RBAC, Data Disposition) และแยกแยะสถานะระหว่าง "READY FOR SIGN-OFF" กับ "FORMALLY SIGNED" อย่างชัดเจน เพื่อให้ผู้มีอำนาจตัดสินใจนำไปใช้ลงนามจริง
  - **ผลการสอบทานเอกสารและความสอดคล้องของหลักฐาน (Document Verification Findings)**:
    1. **ความถูกต้องของผลการทดสอบ**: ยืนยันผลการทดสอบ UAT ครบทุก Test Cases (UAT-REC-001 PASS, UAT-REC-002 Initial Fail $\rightarrow$ Fix & Deploy $\rightarrow$ Re-run PASS, UAT-ISS-001 PASS, UAT-ISS-002 PASS, UAT-ISS-003 PASS, UAT-REJ-001 PASS, STEP 15.1-15.3 PASS)
    2. **ความถูกต้องของตัวเลขและ Invariants**: สต็อกสินค้า `ITEM-TEST-UAT` (ID: 1892) คงเหลือ 18 Box, ProductLots #161 = 8, #164 = 5, #165 = 5 ($8 + 5 + 5 = 18$), FIFO Allocation #206 (Tx #527 $\rightarrow$ Lot #161 = 2 Box), และ Global Stock Invariant 42 รายการ (23 Lots) ครบถ้วน 100%
    3. **ความโปร่งใสของประเด็นปัญหาเดิม**: บันทึกปัญหา `itemType: "Packaging Material"` และการแก้ไขอย่างละเอียด ไม่ปกปิดข้อผิดพลาดเดิม
    4. **การควบคุมความปลอดภัย**: ยืนยันสถานะ `ITEM-TEST-UAT` เป็น `inactive`, Transaction #528 เป็น `rejected`, ค้างรออนุมัติ = 0, ไม่มีการแก้ไข Code, Schema หรือข้อมูล Production ใดๆ ในขั้นตอนนี้
    5. **Sign-off Readiness**: จัดเตรียมส่วนลงนามแบบ Placeholder (ไม่ลงชื่อแทนผู้ใช้) พร้อมระบุสถานะทางการเป็น `FINAL UAT STATUS — PASS / READY FOR SIGN-OFF`

- **ดำเนินการ STEP 16: FINAL UAT SIGN-OFF REVIEW & REPORT บน Production (เสร็จสมบูรณ์ 100% - PASS / READY FOR SIGN-OFF)**:
  - **เหตุผลและเป้าหมาย**: จัดทำรายงานสรุปผลการทดสอบการยอมรับของผู้ใช้ขั้นสุดท้าย (Final UAT Sign-off Review & Final UAT Summary Report) แบบ Read-Only สำหรับระบบบริหารจัดการคลังสินค้า WPK MMS บนสภาพแวดล้อม Production โดยรวบรวมผลการทดสอบครบทุกขอบเขต (23 ขอบเขต), สรุปประเด็นปัญหาที่พบในขั้นตอน UAT-REC-002 เดิม (Root Cause: non-canonical itemType), การแก้ไขและ Deploy, การทดสอบซ้ำ (Re-run), การตรวจสอบความสมบูรณ์ของสต็อกและ FIFO, สิทธิ์ RBAC, และการจัดเก็บข้อมูลทดสอบ (Data Disposition) เพื่อนำเสนอต่อผู้มีอำนาจตัดสินใจในการลงนาม Sign-off
  - **ผลการสรุปและประเมินผลภาพรวม (Executive Summary & Key Findings)**:
    1. **UAT Test Cases (6/6 PASS)**: UAT-REC-001 (PASS), UAT-REC-002 (Initial Fail $\rightarrow$ Fix & Deploy $\rightarrow$ Re-run PASS), UAT-ISS-001 (PASS), UAT-ISS-002 (PASS / FIFO Lot #161 $\rightarrow$ Alloc #206), UAT-ISS-003 (PASS / Blocked & Rejected), UAT-REJ-001 (PASS / Rejected #529)
    2. **Stock & FIFO Invariant**: $\text{Product.quantity} = \sum\text{ProductLot.remainingQuantity} = 18\text{ Box}$ ($8 + 5 + 5 = 18$), Global Invariant 42 รายการ (23 Lots) ถูกต้อง 100% (0 Mismatch, 0 Negative)
    3. **RBAC & Operational Safety**: สิทธิ์การใช้งานแยกชัดเจนตามบทบาท (Staff, Supervisor, Admin), Inactive Product Operational Guard บล็อกการสร้าง Transaction สินค้า Inactive ได้สมบูรณ์ 100%
    4. **Data Disposition Completed**: ปรับสถานะ `ITEM-TEST-UAT` (ID: 1892) เป็น `inactive`, ปิด Transaction #528 ค้างรออนุมัติเป็น `rejected` (0 Pending UAT Transactions), และคงประวัติ Audit Trail (#519, #526, #527, #528, #529, Lots #161, #164, #165, Alloc #206) ครบถ้วน 100%
    5. **Final Technical Quality**: Automated Tests ผ่าน 104/104 (9 test files), TypeScript 0 errors, Builds ผ่าน 100%, ไม่มีข้อบกพร่องทางเทคนิคค้างคา (0 Unresolved Defects)
    6. **UAT Acceptance Conclusion**: `FINAL UAT STATUS — PASS / READY FOR SIGN-OFF`

- **ดำเนินการ STEP 15.3: FINAL UAT DISPOSITION VERIFICATION บน Production (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: ดำเนินการตรวจสอบขั้นสุดท้ายหลังเสร็จสิ้นกระบวนการจัดการข้อมูลทดสอบ UAT (Data Disposition) แบบ Read-Only เพื่อยืนยันว่าสินค้าทดสอบ `ITEM-TEST-UAT` ปรับเป็น `inactive` อย่างปลอดภัย, หลักฐาน Audit Trail ทั้งหมดคงเดิมครบถ้วน 100%, ความสอดคล้องของสต็อกและ ProductLots ทั่วทั้งระบบถูกต้องสมบูรณ์, การจัดสรรแบบ FIFO และประวัติธุรกรรมครบถ้วน, Operational Guard ป้องกันสินค้า inactive ทำงานถูกต้อง, หน้าจอ Dashboards และการส่งออกรายงาน Excel ใช้งานได้ปกติ, และไม่มีการเปลี่ยนแปลงข้อมูลจริงใดๆ
  - **ผลการตรวจสอบทั้ง 19 หมวดหมู่ (100% PASS - FINAL UAT DISPOSITION VERIFICATION — PASS)**:
    1. **Product Status**: `ITEM-TEST-UAT` (Product ID: 1892) อยู่ในสถานะ `inactive`, `itemType: "Packaging"`, `minStock: 10` (PASS)
    2. **Product Quantity**: `Product.quantity` คงเดิมที่ $18\text{ Box}$ ไม่มีการเปลี่ยนแปลง (PASS)
    3. **ProductLot Verification**: ProductLots ทั้ง 3 รายการคงเดิม 100%: Lot #161 = 8, Lot #164 = 5, Lot #165 = 5 (PASS)
    4. **Stock Consistency**: $\text{Product.quantity} = \text{SUM(ProductLot.remainingQuantity)} \rightarrow 18 = 8 + 5 + 5 = 18$ (PASS)
    5. **UAT Transaction History**: ประวัติธุรกรรม UAT ทั้ง 5 รายการคงเดิมสมบูรณ์: #519 (`confirmed` receive 5), #526 (`confirmed` receive 5), #527 (`confirmed` issue 2), #528 (`rejected` issue 19), #529 (`rejected` receive 1) (PASS)
    6. **FIFO Verification**: Transaction #527 มี `TransactionLotAllocation` #206 ตัดยอดจาก Lot เก่าสุด Lot #161 จำนวน 2 Box คงเดิมสมบูรณ์ (PASS)
    7. **Transaction #528 (Insufficient Stock)**: อยู่ในสถานะ `rejected`, มี Note `"UAT Insufficient Stock Test Completed"`, สต็อกคงเดิมที่ 18 Box (PASS)
    8. **Inactive-Product Operational Guard**: พนักงานคลังไม่สามารถสร้าง Transaction สำหรับสินค้า `inactive` ได้ (ระบบตอบกลับ 409 Conflict และบล็อกใน UI Scan) (PASS)
    9. **Inventory Verification**: รายการสินค้าทดสอบ `ITEM-TEST-UAT` ยังคงมีอยู่ในฐานข้อมูล, สามารถตรวจสอบประวัติย้อนหลังได้ตามสิทธิ์, ข้อมูลสินค้าอื่นไม่ถูกแก้ไข (PASS)
    10. **Dashboard Verification**: หน้า Dashboard ของ Staff, Supervisor, และ Admin โหลดข้อมูลได้ถูกต้องสมบูรณ์ ไม่มี runtime/UI error (PASS)
    11. **Transaction History Verification**: หน้า Transactions แสดงประวัติได้ครบถ้วน, Transaction #528 ไม่อยู่ในสถานะ Pending, ยอด Pending UAT Transactions = 0 (PASS)
    12. **Reports / Export Verification**: หน้า Reports และการ Export Excel (`GET /reports/export-excel`) ทำงานได้สมบูรณ์ (HTTP 200) ไม่เกิด runtime error จากสินค้า inactive (PASS)
    13. **Notification Verification**: ระบบแจ้งเตือน Notification ทั้ง 23 รายการคงเดิมสมบูรณ์ ไม่มีการสร้าง Notification ผิดปกติ (PASS)
    14. **Global Stock Consistency**: ตรวจสอบสินค้า 42 รายการในระบบ (มี ProductLots 23 รายการ) พบว่า $\text{Product.quantity} = \text{SUM(ProductLot.remainingQuantity)}$ ครบ 100% โดยมี **0 Mismatches** และ **0 Negative Stock** (PASS)
    15. **Data Safety / Regression Check**: การปรับสถานะมีผลเฉพาะ `ITEM-TEST-UAT` (ID: 1892) จาก `active` $\rightarrow$ `inactive` เท่านั้น โดยไม่มีการแก้ไขข้อมูล Operational อื่นๆ (PASS)
    16. **Code Changes**: NO (PASS)
    17. **Schema Changes**: NO (PASS)
    18. **Deployment Status**: NO (PASS)
    19. **Overall Final Disposition Result**: `FINAL UAT DISPOSITION VERIFICATION — PASS`

  - **เหตุผลและเป้าหมาย**: ดำเนินการปรับเปลี่ยนสถานะของสินค้าทดสอบ `ITEM-TEST-UAT` (Product ID: 1892) จาก `active` $\rightarrow$ `inactive` โดยใช้สิทธิ์ Supervisor ผ่าน API Endpoint `PATCH /products/1892/status` ตามขั้นตอนมาตรฐาน เพื่อซ่อนสินค้าทดสอบและป้องกันไม่ให้พนักงานคลังสแกนหรือทำธุรกรรมผิดพลาดในระหว่างการใช้งานจริง แต่ยังคงรักษาประวัติ Audit Trail, ProductLots, FIFO Allocation, และรายงานย้อนหลังไว้ครบถ้วน 100%
  - **ผลการดำเนินการและการตรวจสอบ (Controlled Status Disposition & Operational Verification)**:
    1. **Pre-condition Check**: ตรวจสอบสถานะก่อนเปลี่ยน: `ITEM-TEST-UAT` (ID: 1892, `status: active`, `quantity: 18 Box`), ProductLots 3 รายการ (8, 5, 5 Box), Transactions #519-#529 และ Allocation #206 ครบถ้วน (PASS)
    2. **Status Update**: เปลี่ยนสถานะเป็น `inactive` สำเร็จผ่าน `PATCH /products/1892/status` (`status: "inactive"`, `quantity: 18`)
    3. **Immediate & Consistency Check**: สต็อกคงเดิมที่ $18\text{ Box}$, ProductLots คงเดิม (Lot #161 = 8, Lot #164 = 5, Lot #165 = 5), Invariant $18 = 8 + 5 + 5 = 18$ (PASS)
    4. **Historical Data Verification**: Transactions #519, #526, #527 (`confirmed`), #528, #529 (`rejected`) และ Allocation #206 คงเดิม 100% ไม่มีการสูญหายหรือเปลี่ยนแปลง
    5. **Operational Safety Guard**: ทดสอบจำลองกรณี Staff พยายามสร้าง Transaction สำหรับ `ITEM-TEST-UAT` $\rightarrow$ ระบบตอบกลับ 409 Conflict (`"สินค้ารายการนี้ถูกปิดการใช้งาน (Inactive)..."`) และบล็อกการสร้างรายการอย่างปลอดภัย 100%
    6. **Reports & Safety**: ส่งออกรายงาน Excel และเข้าถึงประวัติรายการได้สมบูรณ์, ไม่มีการแก้ไข Code, Schema หรือการ Deploy ใดๆ (PASS)

- **ดำเนินการ STEP 15.2: UAT Test Product Disposition Review (Read-Only Review - เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ทำการวิเคราะห์และตรวจสอบผลกระทบเชิงเทคนิค (Impact Analysis) แบบ Read-Only กรณีปรับเปลี่ยนสถานะของสินค้าทดสอบ `ITEM-TEST-UAT` (ID: 1892) จาก `active` $\rightarrow$ `inactive` เพื่อประเมินความปลอดภัยต่อประวัติธุรกรรมย้อนหลัง, ProductLots, FIFO Allocations, รายงานสรุป และกระบวนการทำงานของพนักงานคลัง
  - **ผลการวิเคราะห์ทางเทคนิค (Technical Impact Findings)**:
    1. **ประวัติและหลักฐานย้อนหลัง (Audit Trail)**: การปรับเป็น `inactive` ไม่กระทบต่อ Transactions (#519, #526, #527, #528, #529), ProductLots (#161, #164, #165) หรือ Allocation (#206) ทั้งหมดสามารถเปิดดูและ Export รายงานได้ตามปกติ 100%
    2. **ความสอดคล้องของสต็อก (Stock Invariant)**: ปริมาณ `Product.quantity` (18 Box) และยอดรวม ProductLots ($8 + 5 + 5 = 18\text{ Box}$) ยังคงถูกต้องสมบูรณ์
    3. **ความปลอดภัยในการปฏิบัติงานจริง**: สถานะ `inactive` จะช่วยป้องกันพนักงานคลังไม่ให้สแกนหรือสร้างรายการเบิก/รับสินค้าทดสอบโดยไม่ได้ตั้งใจ (มี Guard ป้องกันทั้งใน UI และ API)
    4. **การรองรับ Workflow**: ระบบมี UI Toggle สำหรับ Supervisor ในหน้า Inventory ในการเปลี่ยนสถานะกลับเป็น `active` ได้ทันทีหากต้องการใช้ทดสอบ Regression หรือ Training ในอนาคต
    5. **ข้อเสนอแนะเชิงธุรกิจ**: แนะนำให้ **SET INACTIVE** โดยรอการอนุมัติอย่างเป็นทางการจากผู้มีอำนาจตัดสินใจ

- **ดำเนินการ STEP 15.1: UAT Test Data Disposition — Close Transaction #528 บน Production (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: ดำเนินการจัดการปิดรายการทดสอบ UAT Transaction #528 ที่ตกค้างอยู่ในสถานะ `pending` ผ่านกระบวนการปฏิเสธรายการ (Supervisor Reject Workflow) ตามขั้นตอนมาตรฐานของระบบ โดยระบุเหตุผล `"UAT Insufficient Stock Test Completed"` เพื่อเคลียร์คิวรออนุมัติของหัวหน้างานให้เป็น 0 พร้อมทั้งรักษาประวัติ Audit Trail ไว้อย่างครบถ้วน 100%
  - **ผลการดำเนินการและการตรวจสอบ (Controlled Disposition & Regression Verification)**:
    1. **Pre-condition Check**: ตรวจสอบสถานะก่อนดำเนินการ `ITEM-TEST-UAT` (ID: 1892, `quantity: 18 Box`), ProductLots 3 รายการรวม 18 Box (Lot #161 = 8, Lot #164 = 5, Lot #165 = 5), Transaction #528 มีสถานะ `pending` ปริมาณ 19 Box และไม่มี Allocation ใดๆ ผูกไว้ (PASS)
    2. **Supervisor Rejection Action**: เข้าสู่ระบบด้วย Supervisor (ID: 10) ปฏิเสธ Transaction #528 สำเร็จผ่าน API มาตรฐาน `POST /transactions/528/reject` พร้อมบันทึก Note `"UAT Insufficient Stock Test Completed"`
    3. **Transaction State**: Transaction #528 เปลี่ยนสถานะจาก `pending` $\rightarrow$ `rejected`, บันทึก `rejectedAt: 2026-09-16T07:41:59.284Z`, `approvedById: 10` ถูกต้อง
    4. **Stock & Lots Protection**: สต็อกสินค้า `Product.quantity` คงเดิมที่ $18\text{ Box}$ ($18 \rightarrow 18$), ProductLots ทั้ง 3 รายการคงเดิม 8, 5, 5 Box (รวม 18 Box) ไม่มีการเคลื่อนไหวของสต็อกหรือการสร้าง Lot/Allocation ใดๆ (PASS)
    5. **Pending Queue**: รายการค้างรออนุมัติของกลุ่มสินค้า UAT ในระบบลดลงเหลือ **0 รายการ** อย่างสมบูรณ์
    6. **Historical Data Safety**: Transactions ในอดีต (#519, #526, #527, #529) คงเดิม 100%, ข้อมูลสินค้า Operational ทั้งหมดไม่ได้รับผลกระทบ, ไม่มีการแก้ไข Code, Schema หรือการ Deploy ใดๆ (PASS)

- **ดำเนินการ UAT Test Data Disposition Review (Read-Only Review - เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ทำการทบทวนและตรวจสอบสถานะข้อมูลทดสอบ UAT ทั้งหมดบนระบบ Production แบบ Read-Only โดยไม่แตะต้องหรือแก้ไขข้อมูล เพื่อจำแนกประเภทและให้คำแนะนำในการจัดการข้อมูลทดสอบ (Data Disposition) ก่อนการทำ UAT Sign-off อย่างเป็นทางการ
  - **สรุปผลการตรวจสอบข้อมูลและข้อเสนอแนะ**:
    1. **UAT Product (`ITEM-TEST-UAT` / ID: 1892)**: สต็อก 18 Box, สถานะ active, itemType Packaging $\rightarrow$ **REQUIRES BUSINESS DECISION** (แนะนำให้คงไว้เพื่อใช้ทดสอบหรือปรับเป็น `inactive` เพื่อซ่อนจากการสแกนของ Staff ทั่วไป)
    2. **ProductLots (Lot #161, #164, #165)**: ยอดคงเหลือ $8 + 5 + 5 = 18\text{ Box}$ $\rightarrow$ **MUST NOT MODIFY** (หลักฐาน Audit Trail ที่เชื่อมโยงกับประวัติ Transaction)
    3. **Transactions (#519, #526, #527, #529)**: ยืนยันแล้วและปฏิเสธแล้ว $\rightarrow$ **MUST NOT MODIFY** (หลักฐานการทดสอบ UAT ที่ห้ามแก้ไข)
    4. **Transaction #528 (Issue 19 Box / Pending)**: รายการทดสอบ Insufficient Stock ที่คงสถานะ `pending` $\rightarrow$ **CLEANUP CANDIDATE / REQUIRES BUSINESS DECISION** (สามารถให้ Supervisor ใช้สิทธิ์ตาม Workflow ปกติในการ Reject เพื่อเคลียร์คิวรออนุมัติได้เมื่อได้รับอนุมัติ)
    5. **Production Safety**: ยืนยันไม่มีการแก้ไข ดัดแปลง หรือลบข้อมูลใดๆ ใน Production, ไม่มีการแก้ไข Code, Schema หรือการ Deploy ใดๆ 100%

- **ดำเนินการทดสอบ Final UAT Verification — Post Functional UAT บน Production (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: ดำเนินการตรวจสอบภาพรวมระบบ (Read-Only Verification) ทั้งหมดใน Production ภายหลังเสร็จสิ้นกระบวนการทดสอบ Functional UAT ครบทุก Test Cases เพื่อยืนยันความถูกต้องของสต็อกสินค้า, ลำดับ FIFO, ความสอดคล้องของข้อมูลทั่วทั้งระบบ (Global Invariant), สิทธิ์การเข้าถึง (RBAC), หน้าจอการทำงานหลัก, และความปลอดภัยของข้อมูลจริง
  - **สรุปผลการตรวจสอบทั้ง 17 หมวดหมู่ (100% PASS)**:
    1. **Product Stock**: `ITEM-TEST-UAT` (ID: 1892) มีสต็อกคงเหลือ 18 Box, สถานะ active, itemType Packaging ถูกต้อง (PASS)
    2. **ProductLot Consistency**: ProductLots 3 รายการ (Lot #161 = 8, Lot #164 = 5, Lot #165 = 5) รวม $8 + 5 + 5 = 18\text{ Box}$ ตรงกับ `Product.quantity` ($18 = 18$) ไม่มียอดติดลบหรือ Lot ซ้ำซ้อน (PASS)
    3. **FIFO Allocation**: Transaction #527 (Issue 2 Box) ตัดยอดจาก Lot เก่าที่สุด Lot #161 ($10 \rightarrow 8$) โดย Lot #164 และ #165 คงเดิมที่ 5 Box พร้อมมี Allocation ชัดเจน (PASS)
    4. **Transaction Status**: ตรวจสอบสถานะธุรกรรม UAT ทั้ง 5 รายการถูกต้องครบถ้วน (#519 confirmed, #526 confirmed, #527 confirmed, #528 pending, #529 rejected) (PASS)
    5. **Reject Safety**: Transaction #529 (Rejected Receive) ไม่มีผลกระทบต่อสต็อกสินค้าและไม่มีการสร้าง Lot (PASS)
    6. **Insufficient Stock Safety**: Transaction #528 (Issue 19 Box) ถูกบล็อกการยืนยันและคงสถานะ pending โดยสต็อกคงเดิมที่ 18 Box ไม่มีการตัดยอดติดลบ (PASS)
    7. **Global Stock Consistency**: ตรวจสอบสินค้าทั้งหมด 42 รายการในระบบ (สินค้าที่มี Lots ทั้งหมด 23 รายการ) พบว่า $\text{Product.quantity} = \text{SUM(ProductLot.remainingQuantity)}$ ครบ 100% โดยมี **0 Mismatches** (PASS)
    8. **RBAC**: ตรวจสอบสิทธิ์ Staff ถูกบล็อกจากการ Confirm/Reject (403 Forbidden) และมองเห็นเฉพาะรายการตนเอง, Supervisor เข้าถึงได้ทั่วทั้งคลัง, Admin จัดการผู้ใช้ได้ถูกต้อง (PASS)
    9. **Dashboard / Inventory / Transactions / Reports / Notifications / Health**: ทุกหน้าจอโหลดข้อมูลสมบูรณ์, การส่งออกรายงาน Excel ทำงานได้ปกติ, Notification แจ้งเตือนและเชื่อมโยงถูกต้อง, ระบบ Backend / Database เชื่อมต่อปกติ 100%
    10. **Data & Deployment Safety**: ไม่มีการแก้ไขข้อมูล Operational, ไม่มีการแก้ไข Code, Schema หรือการ Deploy ใดๆ ระหว่างการตรวจสอบ (PASS)

- **ดำเนินการทดสอบ UAT-REJ-001: Supervisor Reject Transaction บน Production (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: ดำเนินการทดสอบ Controlled Production Write Test สำหรับกระบวนการปฏิเสธรายการ (Reject Workflow) โดยพนักงานคลัง (Staff) สร้างรายการรับเข้าทดสอบ Transaction #529 (1 Box, `LOT-UAT-REJECT-01`) และหัวหน้างาน (Supervisor / User ID 10) ปฏิเสธรายการพร้อมระบุเหตุผล `"Incorrect Lot Code"` เพื่อตรวจสอบว่ารายการเปลี่ยนสถานะเป็น `rejected` อย่างถูกต้อง และสต็อกสินค้า `Product.quantity` รวมถึง `ProductLot` ทั้งหมดไม่มีการเปลี่ยนแปลงเด็ดขาด
  - **ผลการทดสอบ (Controlled Rejection Verification)**:
    1. **STEP 1 (Precheck)**: ตรวจสอบสถานะเริ่มต้น: `ITEM-TEST-UAT` (ID 1892) มี `quantity = 18 Box`, มี 3 ProductLots รวม 18 Box (Lot #161 = 8, Lot #164 = 5, Lot #165 = 5), Invariant $18 = 8 + 5 + 5 = 18$ (PASS) และตรวจสอบ Transactions #519, #526, #527 (`confirmed`) และ #528 (`pending`) ถูกต้องครบถ้วน
    2. **STEP 2 (Login as Staff)**: เข้าสู่ระบบด้วย Staff (`warehouse_staff` / User ID: 7) สำเร็จ
    3. **STEP 3 & 4 (Create Receive Tx 1 Box)**: สร้างรายการรับเข้า Transaction ID: 529 (`ITEM-TEST-UAT`, Type: `receive`, Quantity: 1 Box, Lot: `LOT-UAT-REJECT-01`, Note: `UAT Reject Test`) ได้สถานะ `pending`, สต็อกคงเหลือ 18 Box, ProductLots ยังคงมี 3 รายการเดิม
    4. **STEP 5 & 6 (Supervisor Reject Tx #529)**: เข้าสู่ระบบด้วย Supervisor (ID: 10) ทำการปฏิเสธรายการ Transaction #529 พร้อมระบุเหตุผล `"Incorrect Lot Code"` สำเร็จ
    5. **STEP 7 (Verify Reject Result)**: Transaction #529 เปลี่ยนสถานะเป็น `rejected`, บันทึก `rejectedAt: 2026-09-16T07:04:58.931Z`, `approvedById: 10`, และ Note = `"Incorrect Lot Code"` ถูกต้อง
    6. **STEP 8 (Verify Stock Protection)**: สต็อก `Product.quantity` ปลอดภัยและคงเดิมที่ $18\text{ Box}$ ($18 \rightarrow 18$) ไม่มีการเพิ่มหรือลดสต็อก (PASS)
    7. **STEP 9 (Verify ProductLots Protection)**: ProductLots ทุกรายการคงเดิม 100% (Lot #161 = 8, Lot #164 = 5, Lot #165 = 5, รวม 18 Box) ไม่มีการสร้าง Lot ใหม่ขึ้นมา (PASS)
    8. **STEP 10 (Verify Allocations)**: ไม่มีการสร้าง `TransactionLotAllocation` สำหรับรายการที่ถูกปฏิเสธ (PASS)
    9. **STEP 11 (Scope Safety)**: Transactions ในอดีต (#519, #526, #527, #528) คงเดิม 100%, ข้อมูลสินค้า Operational อื่นๆ ไม่ได้รับผลกระทบ, ไม่มีการแก้ไข Code, Schema หรือการ Deploy ใดๆ

- **ดำเนินการทดสอบ UAT-ISS-003: Insufficient Stock Prevention บน Production (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: ดำเนินการทดสอบ Controlled Production Write Test เพื่อตรวจสอบกลไกการป้องกันการเบิกสินค้าเกินสต็อกคงเหลือ (Insufficient Stock Prevention) โดยพนักงานคลัง (Staff) สร้างรายการเบิกสินค้า 19 Box สำหรับ `ITEM-TEST-UAT` ที่มีสต็อกคงเหลือเพียง 18 Box และตรวจสอบว่าระบบต้องป้องกันไม่ให้มีการตัดสต็อกติดลบ ยอดสต็อก `Product.quantity` และ `ProductLot` ทั้งหมดยังคงปลอดภัย 100%
  - **ผลการทดสอบ (Controlled Insufficient Stock Verification)**:
    1. **STEP 1 (Precheck)**: ตรวจสอบสถานะเริ่มต้น: `ITEM-TEST-UAT` (ID 1892) มี `quantity = 18 Box`, มี 3 ProductLots รวม 18 Box (Lot #161 = 8, Lot #164 = 5, Lot #165 = 5), Invariant $18 = 8 + 5 + 5 = 18$ (PASS)
    2. **STEP 2 (Login as Staff)**: เข้าสู่ระบบด้วยบัญชี Staff (`warehouse_staff` / User ID: 7) สำเร็จ
    3. **STEP 3 (Create Issue Tx 19 Box)**: สร้างรายการเบิก Transaction ID: 528 (`ITEM-TEST-UAT`, Type: `issue`, Quantity: 19 Box, Note: `UAT Insufficient Stock Test`) ได้สถานะ `pending`
    4. **STEP 4 (Supervisor Confirm Blocked)**: เข้าสู่ระบบด้วย Supervisor (ID: 10) พยายามยืนยัน Transaction #528 $\rightarrow$ ระบบบล็อกการยืนยันทันทีเนื่องจากสต็อกใน Lot ไม่เพียงพอ (Insufficient Stock / Error Response) และทำการ Rollback รายการทั้งหมด
    5. **STEP 5 (Verify Stock Protection)**: สต็อก `Product.quantity` ได้รับการป้องกันอย่างสมบูรณ์ คงเดิมที่ $18\text{ Box}$ ($18 \rightarrow 18$) ไม่มีการลดสต็อกหรือติดลบ (PASS)
    6. **STEP 6 (Verify Product Lot Protection)**: ProductLots ทุกรายการคงเดิม 100% (Lot #161 = 8, Lot #164 = 5, Lot #165 = 5, รวม 18 Box) ไม่มีการตัดยอดบางส่วนหรือทำให้ Lot ติดลบ (PASS)
    7. **STEP 7 (Verify Transaction State)**: Transaction #528 ยังคงสถานะ `pending` (ไม่สามารถ confirm ได้) ปลอดภัย
    8. **STEP 8 (Verify FIFO Safety)**: ไม่มีการสร้าง `TransactionLotAllocation` สำหรับ Transaction #528 และไม่มีการตัดสต็อกผิดพลาด
    9. **STEP 9 (Scope Safety)**: รายการที่ยืนยันแล้วในอดีต (Tx #519, #526, #527) คงเดิม 100%, สต็อกสินค้า Operational อื่นๆ ไม่ได้รับผลกระทบ, ไม่มีการแก้ไข Code, Schema หรือการ Deploy ใดๆ

- **ดำเนินการทดสอบ UAT-ISS-002: Supervisor Confirm Issue + FIFO Verification บน Production (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: ดำเนินการทดสอบ Controlled Production Write Test สำหรับกระบวนการยืนยันการเบิกสินค้า (Issue Workflow) โดยหัวหน้างาน (Supervisor / User ID 10) เพื่ออนุมัติ Transaction #527 และตรวจสอบว่าการตัดยอดสต็อกเป็นไปตามกฎ FIFO (First-In, First-Out) โดยตัดสต็อกออกจาก ProductLot ที่เก่าที่สุดก่อน และยอดรวมคงเหลือของ ProductLots ต้องตรงกับ `Product.quantity` อย่างสมบูรณ์ 100%
  - **ผลการทดสอบ (Controlled Workflow & FIFO Verification)**:
    1. **STEP 1 (Precheck)**: ตรวจสอบสถานะเริ่มต้น: `ITEM-TEST-UAT` (ID 1892) มี `quantity = 20 Box`, มี 3 ProductLots รวม 20 Box (Lot #161 = 10, Lot #164 = 5, Lot #165 = 5), Transaction #527 มีสถานะ `pending`, ปริมาณ 2 Box ตรวจสอบ Invariant $20 = 10 + 5 + 5 = 20$ (PASS)
    2. **STEP 2 & 3 (Supervisor Confirm Tx #527)**: เข้าสู่ระบบด้วย Supervisor (ID: 10) ยืนยันรายการเบิกสินค้า Transaction #527 สำเร็จผ่าน API มาตรฐาน
    3. **STEP 4 (Verify Transaction)**: Transaction #527 เปลี่ยนสถานะเป็น `confirmed`, บันทึก `confirmedAt: 2026-09-16T06:40:05.457Z` และ `approvedById: 10` ถูกต้อง
    4. **STEP 5 (Verify Product Stock)**: `Product.quantity` ลดลงตรงตามจำนวนที่เบิก $20 \rightarrow 18\text{ Box}$ (ลดลง 2 Box พอดี ไม่มีการตัดสต็อกซ้ำ)
    5. **STEP 6 (Verify FIFO Allocation)**: การตัดยอดสต็อกระดับ Lot เป็นไปตาม FIFO โดยตัดจาก Lot ที่เก่าที่สุดคือ Lot #161 (`LOT-UAT-INIT`) จำนวน 2 Box ทำให้คงเหลือ $10 \rightarrow 8\text{ Box}$ ขณะที่ Lot #164 ($5 \rightarrow 5$) และ Lot #165 ($5 \rightarrow 5$) ไม่ถูกตัดยอด (PASS)
    6. **STEP 7 (Stock Consistency)**: ตรวจสอบความสอดคล้อง $\text{Product.quantity} = \text{SUM(ProductLot.remainingQuantity)}$ ได้ $18 = 8 + 5 + 5 = 18$ (PASS) และไม่มี Lot ใดติดลบ
    7. **STEP 8 (Transaction Lot Allocation)**: Transaction #527 มีบันทึก `TransactionLotAllocation` ถูกต้องตรงกับ Lot #161 จำนวน 2 Box
    8. **STEP 9 (Scope Safety)**: ไม่มีรายการธุรกรรมซ้ำซ้อน, Transaction #519 และ #526 คงเดิม, สต็อกสินค้า Operational อื่นๆ ไม่ได้รับผลกระทบ, ไม่มีการแก้ไข Code, Schema หรือการ Deploy ใดๆ

- **ดำเนินการทดสอบ UAT-ISS-001: Staff Create Issue Transaction บน Production (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: ดำเนินการทดสอบ Controlled Production Write Test สำหรับกระบวนการเบิกสินค้า (Issue Workflow) โดยพนักงานคลัง (Staff / User ID 7) เพื่อตรวจสอบว่าเมื่อสร้างรายการเบิกสินค้า สถานะของรายการต้องเป็น `pending` โดยที่สต็อกสินค้าจริง (`Product.quantity`) และ `ProductLot` จะต้องไม่ถูกตัดยอดก่อนที่หัวหน้างาน (Supervisor) จะอนุมัติ
  - **ผลการทดสอบ (Controlled Workflow Verification)**:
    1. **STEP 1 (Precheck)**: ตรวจสอบสถานะก่อนสร้างรายการ: `ITEM-TEST-UAT` (ID 1892) มี `quantity = 20 Box`, ProductLots 3 รายการรวม 20 Box (Lot #161 = 10, Lot #164 = 5, Lot #165 = 5), Transactions #519 และ #526 อยู่ในสถานะ `confirmed` ถูกต้องครบถ้วน (PASS)
    2. **STEP 2 (Login as Staff)**: เข้าสู่ระบบด้วยบัญชี Staff (`warehouse_staff`) สำเร็จ
    3. **STEP 3 (Create Issue Tx)**: สร้างรายการเบิกสินค้า Transaction ID: 527 (`ITEM-TEST-UAT`, Type: `issue`, Quantity: 2 Box, Note: `UAT Test Issue`) สำเร็จ
    4. **STEP 4 (Verify Transaction)**: Transaction ID 527 อยู่ในสถานะ `pending`, `createdById: 7`, ปริมาณ 2 Box ถูกต้อง
    5. **STEP 5 (Stock Unchanged)**: สต็อกสินค้าคงเหลือ `Product.quantity` ยังคงเดิมที่ $20\text{ Box}$ ($20 \rightarrow 20$) ไม่มีการลดสต็อกก่อนได้รับอนุมัติ (PASS)
    6. **STEP 6 (Lots Unchanged)**: ProductLots ทั้ง 3 รายการยังคงมีจำนวนคงเหลือเดิม 10, 5, 5 Box (รวม 20 Box) ไม่มีการตัดยอดในระดับ Lot (PASS)
    7. **STEP 7 (Supervisor Pending Queue)**: รายการ Transaction #527 ปรากฏใน Pending Queue ของ Supervisor และเกิดการแจ้งเตือน Notification (ID: 673) ไปยัง Supervisor ถูกต้อง
    8. **STEP 8 (Scope Safety)**: ไม่มีรายการธุรกรรมซ้ำซ้อน, Transaction #519 และ #526 คงเดิม, ไม่มีผลกระทบต่อสินค้าอื่นในระบบ
- **ดำเนินการทดสอบ UAT Re-run: Receive -> Supervisor Confirm -> ProductLot Auto-Creation บน Production (เสร็จสมบูรณ์ 100% - PASS)**:
  - **เหตุผลและเป้าหมาย**: ทำการทดสอบ Controlled Production Write Test เพื่อพิสูจน์ว่าหลังจากการ Deploy โค้ดที่แก้ไข `isPackagingItem` เมื่อ Staff สร้างรายการรับเข้าและ Supervisor ทำการอนุมัติยืนยัน ระบบจะสร้าง ProductLot ใหม่อัตโนมัติและเพิ่มสต็อกสินค้าอย่างถูกต้องสอดคล้องกัน 100%
  - **ขั้นตอนการทดสอบ (Controlled Workflow)**:
    1. **STEP 1 (Precheck)**: ตรวจสอบสถานะก่อนทดสอบ `ITEM-TEST-UAT` (ID 1892): `Product.quantity = 15`, `itemType = "Packaging"`, ProductLots รวม = 15 (Lot #161 = 10, Lot #164 = 5) $\rightarrow$ $15 = 15$ (PASS)
    2. **STEP 2 (Staff Create)**: เข้าสู่ระบบด้วย Staff (ID: 7) สร้างรายการรับเข้า Transaction ID: 526 (`ITEM-TEST-UAT`, Qty: 5, Lot: `LOT-UAT-REC-RERUN-01`, Note: `UAT Re-run Receive Confirm`) $\rightarrow$ ได้สถานะ `pending`, สต็อกคงเดิมที่ 15 Box, ยังไม่มีการสร้าง ProductLot ก่อนอนุมัติ (PASS)
    3. **STEP 3 (Supervisor Confirm)**: เข้าสู่ระบบด้วย Supervisor (ID: 10) ยืนยันรายการ Transaction ID: 526 ผ่าน API $\rightarrow$ สถานะเปลี่ยนเป็น `confirmed`
    4. **STEP 4 (Verify Fix)**:
       - `Product.quantity` เพิ่มขึ้นจาก $15 \rightarrow 20\text{ Box}$
       - ระบบสร้าง ProductLot ใหม่ให้อัตโนมัติ (Lot ID: 165, `lotNumber: "LOT-20260916-0165"`, `supplierLot: "LOT-UAT-REC-RERUN-01"`, `receivedQuantity: 5`, `remainingQuantity: 5`, `status: "active"`, `transactionId: 526`)
       - ยอดรวม ProductLots: Lot #161 (10) + Lot #164 (5) + Lot #165 (5) = 20 Box
       - Invariant: $\text{Product.quantity} = \text{SUM(ProductLot.remainingQuantity)}$ ($20 = 20$) $\rightarrow$ **PASS**
    5. **STEP 5 (Scope Safety)**: ไม่มีรายการธุรกรรมซ้ำซ้อน, Transaction #519 และ Lot #161, #164 คงเดิม, สินค้า Operational อื่นๆ ไม่ได้รับผลกระทบ
- **ดำเนินการ Deploy โค้ดแก้ไข Packaging / ProductLot / FIFO สู่ Production (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: นำโค้ดที่ผ่านการแก้ไขและทดสอบ Unit Test ครบ 104/104 tests (100% PASS) ขึ้นสู่ Production Repository เพื่อให้ระบบ Live Production (Render Backend & Vercel Frontend) ใช้งาน Logic ใหม่ที่ถูกต้อง ป้องกันปัญหา Inconsistency ในอนาคต
  - **ขั้นตอนการตรวจสอบและการ Deploy (Git & CI/CD)**:
    1. **Pre-Deployment Tests**: รัน `npx vitest run` ผ่าน 104/104 tests (9 test files), TypeScript Backend 0 errors, TypeScript Frontend 0 errors, Frontend Build (`next build`) PASS, Backend Build (`tsc`) PASS
    2. **Git Commit & Push**: บันทึก Commit `37e5f34` ด้วยข้อความ `"fix: normalize packaging item type for FIFO lot tracking"` และ Push สู่ Branch `main` บน GitHub (`Sirithorn-PS/QR-Code`) เรียบร้อย
    3. **Post-Deployment Read-Only Verification**:
       - ทดสอบ Authentication เข้าสู่ระบบสำเร็จครบทั้ง 3 Roles: `admin` (Admin), `staff` (Warehouse Staff), `supervisor` (Supervisor)
       - ตรวจสอบ `ITEM-TEST-UAT` (Product ID 1892): `Product.quantity = 15 Box`, `itemType = "Packaging"`, ProductLots รวม = 15 Box (Lot #161 = 10, Lot #164 = 5) $\rightarrow$ $15 = 15$ (**PASS**)
       - ตรวจสอบ Transaction #519: สถานะ `confirmed`, ปริมาณ 5 Box คงเดิม 100%
       - ตรวจสอบ Scope Safety: ไม่มีการสร้าง Transaction ใหม่, ไม่มีการลบข้อมูล, ไม่มีการเปลี่ยนแปลง Schema ใดๆ
- **ดำเนินการกู้คืนความถูกต้องของข้อมูล UAT Data Recovery สำหรับ ITEM-TEST-UAT / Transaction #519 (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: คืนค่าความสอดคล้องของข้อมูลสต็อกระหว่าง `Product.quantity` (15 Box) และ `SUM(ProductLot.remainingQuantity)` ให้เท่ากัน ($15 = 15$) ภายหลังการยืนยัน Transaction #519
  - **ขั้นตอนที่ดำเนินการ (Controlled Atomic Transaction)**:
    1. **Precheck**: ตรวจสอบสถานะดั้งเดิม (Product ID 1892, `quantity: 15`, `itemType: "Packaging Material"`, Lot #161 `remainingQuantity: 10`, Transaction #519 `confirmed`, ไม่มี Lot ซ้ำซ้อน)
    2. **Normalize ItemType**: ปรับปรุง `itemType` ของ `ITEM-TEST-UAT` (ID 1892) เฉพาะรายการนี้ให้เป็น `"Packaging"` (Canonical Form)
    3. **Create Missing ProductLot**: สร้าง ProductLot ID: 164 (`lotNumber: "LOT-20260916-0164"`, `supplierLot: "LOT-UAT-REC01"`, `receivedQuantity: 5`, `remainingQuantity: 5`, `status: "active"`, `transactionId: 519`)
    4. **Invariant Check & Commit**: ตรวจสอบ Invariant `Product.quantity === SUM(ProductLot.remainingQuantity)` ($15 = 15$) สำเร็จ 100% ภายใน Database Transaction เดียวกัน
  - **ผลการตรวจสอบหลังการกู้คืน (Verification)**:
    - `ITEM-TEST-UAT` (ID 1892): `itemType = "Packaging"`, `quantity = 15 Box`
    - ProductLots: Lot #161 (10 Box) + Lot #164 (5 Box) = รวม 15 Box
    - Transaction #519: สถานะ `confirmed` คงเดิม, ปริมาณ 5 คงเดิม ไม่มีการลบหรือสร้าง Transaction ซ้ำ
    - Scope Safety: สินค้าอื่นๆ และข้อมูล Operational ทั้งหมดยังคงเดิม 100%, ไม่มีรายการสูญหาย, ไม่มีการ Deploy ในขั้นตอนนี้
- **ดำเนินการแก้ไขโค้ด Packaging Item Type + ProductLot + FIFO Logic (Code Fix Only - ไม่แตะต้อง Production Data)**:
  - **เหตุผลและเป้าหมาย**: แก้ไขข้อผิดพลาดเชิงตรรกะที่พบจาก UAT-REC-002 ที่ระบบใช้เงื่อนไขแบบเข้มงวด `itemType === 'Packaging'` ทำให้สินค้าที่มีประเภทเป็น `'Packaging Material'` ถูกข้ามขั้นตอนการสร้าง `ProductLot` และการจัดสรร `FIFO Lot Allocation` เมื่อยืนยันรายการรับเข้า/เบิกออก
  - **การปรับปรุง Logic และ Source Code**:
    1. **สร้างฟังก์ชันส่วนกลาง `isPackagingItem` และ `normalizeItemType`**:
       - สร้างใน `backend/src/index.ts` และ `frontend/lib/packaging.ts` เพื่อ Normalize ข้อความและตัวพิมพ์ (Case-insensitive, Trim) เช่น `"Packaging"`, `"packaging"`, `" PACKAGING "`, `"Packaging Material"`, `"packaging_material"` ให้ถือเป็นสินค้า Packaging ทั้งหมดอย่างปลอดภัย
       - กำหนดให้ Canonical Storage สำหรับสินค้าใหม่ถูกจัดเก็บเป็น `"Packaging"` เสมอผ่าน `normalizeItemType`
    2. **ปรับปรุง Receive Confirmation (`POST /transactions/:id/confirm`)**:
       - ตรวจสอบ `isPackagingItem` เพื่อสร้าง `ProductLot` ควบคู่กับการอัปเดต `Product.quantity` ให้อยู่ใน Database Transaction เดียวกันเสมอ รักษา Invariant: `Product.quantity = SUM(ProductLot.remainingQuantity)`
    3. **ปรับปรุง Issue FIFO Allocation (`POST /transactions/:id/confirm`)**:
       - ตรวจสอบ `isPackagingItem` เพื่อทำการตัดยอดสต็อกตามลำดับ FIFO (1. `receivedDate ASC` -> 2. `Transaction.createdAt ASC` -> 3. `ProductLot.id ASC`)
    4. **ปรับปรุงจุดที่เกี่ยวข้องในระบบ**:
       - `GET /products/:productId/lots`, `PATCH /products/:id/min-stock`, `PATCH /products/:id/status`, `POST /products`, `POST /products/with-bom`
       - หน้าจอ Frontend (`frontend/app/inventory/page.tsx`, `frontend/app/transactions/page.tsx`, `frontend/app/scan/page.tsx`, `frontend/app/dashboard/page.tsx`)
    5. **เพิ่ม Automated Tests ครอบคลุม Test 1 - Test 6**:
       - สร้าง `frontend/__tests__/unit/packaging-fifo.test.ts` (20 tests) และ `backend/__tests__/packaging.unit.test.ts` (10 tests)
  - **ผลการตรวจสอบและการทดสอบ (Verification)**:
    - **TypeScript Type Check**: Backend 0 errors, Frontend 0 errors
    - **Build**: Frontend Production Build (`next build`) ผ่านสำเร็จ 100%, Backend (`tsc`) ผ่านสำเร็จ 100%
    - **Automated Tests**: รวม 9 Test Files ผ่านครบ 104/104 tests (100% PASS จาก Baseline เดิม 84 tests)
    - **Production Safety**: ยืนยันไม่มีการแก้ไขข้อมูลใน Production Database, ไม่มีการแตะต้อง Transaction #519, ไม่มีการ Deploy ในขั้นตอนนี้
- **ดำเนินการทดสอบ UAT-REC-002 (Supervisor Confirm Receive) บนระบบ Production**:
  - **เหตุผลและเป้าหมาย**: ดำเนินการทดสอบ Controlled Production Write Test ตามแผน UAT Test Case `UAT-REC-002` โดยใช้บทบาท Supervisor เพื่ออนุมัติยืนยันรายการรับเข้าหมายเลข 519 (Receive Quantity 5) สำหรับ `ITEM-TEST-UAT`
  - **ผลการทดสอบ**:
    - ยืนยันรายการสำเร็จ: สถานะ Transaction เปลี่ยนจาก `pending` เป็น `confirmed`, บันทึก `confirmedAt` และ `approvedById: 10` (Supervisor) ถูกต้อง
    - สต็อกรวม (`Product.quantity`) เพิ่มขึ้นจาก 10 เป็น 15 Box ตามที่คาดหมาย
    - ผลการตรวจสอบ ProductLot: พบว่าระบบไม่ได้สร้าง ProductLot ใหม่สำหรับ `LOT-UAT-REC01` เนื่องจากเงื่อนไขในระบบ `backend/src/index.ts` กำหนดการสร้าง Lot สำหรับสินค้าที่มี `itemType === 'Packaging'` แต่ `ITEM-TEST-UAT` ถูกสร้างด้วย `itemType: 'Packaging Material'` ส่งผลให้ยอดรวม ProductLot คงเหลืออยู่ที่ 10 Box ในขณะที่ Product.quantity อยู่ที่ 15 Box ($15 \neq 10$)
    - สถานะการทดสอบ: **FAIL** (หยุดการทดสอบทันทีตามกฎ UAT Safety Protocol เพื่อรายงานปัญหาให้ผู้ใช้งานทราบโดยไม่แก้ไขโค้ดหรือฐานข้อมูลเอง)
- **ดำเนินการทดสอบ UAT-REC-001 (Staff Create Receive Transaction) บนระบบ Production (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ดำเนินการทดสอบ Controlled Production Write Test ตามแผน UAT Test Case `UAT-REC-001` โดยใช้บทบาทพนักงานคลัง (Staff / `warehouse_staff`) เพื่อสร้างรายการรับเข้าสำหรับสินค้าทดสอบ UAT (`ITEM-TEST-UAT`) จำนวน 5 Box และตรวจสอบว่าสถานะรายการเป็น `pending` โดยที่สต็อกสินค้าจริง (`Product.quantity`) ยังคงเดิมไม่เพิ่มขึ้นก่อนได้รับการอนุมัติจาก Supervisor
  - **ผลการทดสอบ**:
    - เข้าสู่ระบบด้วยบัญชี Staff สำเร็จ ได้รับ JWT Token ถูกต้อง
    - ดึงข้อมูลสินค้า `ITEM-TEST-UAT` สำเร็จ
    - สร้างรายการ Receive Transaction (ID: `519`, Quantity: `5`, Lot: `LOT-UAT-REC01`, Note: `UAT Test Receive`) สำเร็จ และได้สถานะ `pending`
    - สต็อกคงเหลือของ `ITEM-TEST-UAT` ยังคงอยู่ที่ `10 Box` เท่าเดิม และ `ProductLot` (LOT-UAT-INIT) ยังคงมี `10 Box` เท่าเดิม ไม่มีการเปลี่ยนแปลงก่อนการอนุมัติ
    - เกิดการแจ้งเตือน (`Notification` ID: `667`) ไปยังกลุ่มผู้ใช้งาน `supervisor` เพื่อรอยืนยันรายการตาม Workflow อย่างถูกต้อง

## 15 ก.ย. 2026
- **ตรวจสอบและปรับปรุง Business Logic ด้าน Stock (Low Stock / Out of Stock / Action Required) สำหรับ Supervisor Dashboard (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ตรวจสอบการนับสถานะสต็อกสินค้าบน Supervisor Dashboard ([frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)) ให้แบ่งแยก 3 สถานะอย่างเด็ดขาด ป้องกันการนับซ้ำ:
    1. **Out of Stock**: `quantity === 0` (สินค้าหมดในคลัง 0 ชิ้น)
    2. **Low Stock**: `quantity > 0 && quantity <= (minStock ?? 0)` (สินค้าคงเหลือน้อยกว่าหรือเท่ากับจุดสั่งซื้อขั้นต่ำ และมีมากกว่า 0 ชิ้น)
    3. **Normal**: `quantity > (minStock ?? 0)` (สินค้าคงเหลือปกติ)
  - **การปรับปรุงใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - เพิ่มเงื่อนไข `p.quantity > 0` ใน `lowStockCount` filter เพื่อให้สินค้าที่หมด (`quantity === 0`) ไม่ถูกนับซ้ำในการ์ดสต็อกใกล้หมดและแจ้งเตือน Action Required
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): ผ่าน 100% 0 errors
    - Vitest Unit Tests (`npm run test`): ผ่านทั้งหมด 84/84 tests (100% PASS)
    - ยืนยันไม่มีการเปลี่ยน Layout, Component UI หรือ Feature อื่นๆ ในระบบ
- **ปรับปรุง Dashboard สำหรับ Role Supervisor (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ปรับปรุงหน้า Supervisor Dashboard ([frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)) ให้มุ่งเน้น "ภาพรวมคลังสินค้า + การติดตามงาน + การตรวจสอบธุรกรรม" ตามโครงสร้าง visual hierarchy 7 ระดับ โดยไม่กระทบ Staff Dashboard หรือ Admin Dashboard และไม่เปลี่ยนแปลง Backend, Database, หรือ RBAC ใดๆ
  - **การปรับปรุงทั้ง 7 ระดับบน Supervisor Dashboard**:
    1. **Level 1: Warehouse Overview**: แสดง 4 การ์ดสรุปภาพรวม (Packaging ทั้งหมด 23 รายการ, จำนวนคงเหลือรวม 103,648 ชิ้น, สต็อกใกล้หมด 0 รายการ, และสินค้าหมด 0 รายการ) จากข้อมูลจริงโดยไม่ Hardcode
    2. **Level 2: Warehouse Activity Today (กิจกรรมธุรกรรมคลังสินค้า)**: แสดงภาพรวมรับเข้าวันนี้, เบิกออกวันนี้, และรายการรอยืนยันทั้งคลังสินค้า
    3. **Level 3: Warehouse Activity 7 Days (สรุปการรับเข้า - เบิกออก 7 วันล่าสุด)**: กราฟแท่ง Grouped Bar Chart แสดงข้อมูลจริงย้อนหลัง 7 วัน พร้อม Scale แกน Y และ Legend ภาษาไทย
    4. **Level 4: Packaging Distribution (สัดส่วนวัตถุดิบบรรจุภัณฑ์)**: Donut Chart คำนวณตามหมวดหมู่จริง (แกลลอน, ฝา, ฟอยล์, กล่อง, ฉลาก)
    5. **Level 5: Action Required (งานที่ต้องดำเนินการ)**: แสดงรายการ Pending / Low stock รอดำเนินการ หรือ Empty State "ไม่มีรายการที่ต้องดำเนินการ" และ "สถานะเรียบร้อย"
    6. **Level 6: Supervisor Quick Actions (เมนูดำเนินการด่วน)**: ทางลัดเน้นการตรวจสอบและจัดการ (ตรวจสอบรายการ, ดูสต็อกบรรจุภัณฑ์, ธุรกรรมทั้งหมด, ดูรายงานทั้งหมด)
    7. **Level 7: Recent Transactions (รายการล่าสุด)**: ตารางประวัติธุรกรรมทั้งคลังพร้อมคอลัมน์ "ผู้ดำเนินการ" และระบบ Pagination หน้าละ 5 รายการ
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): ผ่าน 100% 0 errors
    - Vitest Unit Tests (`npm run test`): ผ่านทั้งหมด 84/84 tests (100% PASS)
    - Browser Subagent Verification: ตรวจสอบการแสดงผลจริงใน Browser ทั้ง Desktop (1280x800) และ Mobile (375x812) ไม่พบ Horizontal Overflow และ Visual Hierarchy ตรงตามข้อกำหนด 100%
- **ปรับแต่งสีตัวหนังสือสถานะ "รับเข้า", "เบิกออก" และ "ยืนยันแล้ว" ในหน้ารายงาน (Reports Page) (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ตามคำขอของผู้ใช้งาน ในหน้ารายงาน ([frontend/app/reports/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/reports/page.tsx)) ได้ปรับคำว่า **"รับเข้า"** และ **"ยืนยันแล้ว"** ให้แสดงผลเป็นตัวหนังสือ **สีเขียว (`text-emerald-600 font-medium`)** และคำว่า **"เบิกออก"** (รวมถึง "ปฏิเสธแล้ว") ให้แสดงผลเป็นตัวหนังสือ **สีแดง (`text-[#BE1111] font-medium`)** โดยใช้ **ตัวหนังสือธรรมดา (ไม่ใช่ตัวหนา)** และไม่มีกล่องไฮไลท์พื้นหลังตามความต้องการ
  - **การปรับปรุงใน [frontend/app/reports/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/reports/page.tsx)**:
    - **รับเข้า**: เปลี่ยนเป็น `<span className="font-medium text-emerald-600 text-xs sm:text-sm">รับเข้า</span>`
    - **เบิกออก**: เปลี่ยนเป็น `<span className="font-medium text-[#BE1111] text-xs sm:text-sm">เบิกออก</span>`
    - **ยืนยันแล้ว**: เปลี่ยนเป็น `<span className="font-medium text-emerald-600 text-xs sm:text-sm">ยืนยันแล้ว</span>`
    - **ปฏิเสธแล้ว**: เปลี่ยนเป็น `<span className="font-medium text-[#BE1111] text-xs sm:text-sm">ปฏิเสธแล้ว</span>`
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): ผ่านเรียบร้อย 0 errors
- **ปรับแต่งฟอนต์หน้าสต็อกให้ตรงกับแถบเมนู (Prompt) และแสดงข้อความหัวข้อเต็มครบถ้วน (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ตามคำขอของผู้ใช้งาน ให้ปรับแต่งองค์ประกอบทั้งหมดในหน้าสต็อก ([frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx)) ให้ใช้ฟอนต์ **Prompt (`font-display`)** แบบเดียวกับแถบเมนูข้าง 100% พร้อมปรับขนาดตัวอักษรหัวข้อหลัก `จัดการสต็อกบรรจุภัณฑ์ (Packaging Stock)` โดยเอาคลาส `truncate` ออก และใส่ `whitespace-nowrap` เพื่อให้แสดงผลตัวอักษรครบทุกตัวโดยไม่มีจุดไข่ปลา (`...`) ตัดท้ายข้อความ
  - **การปรับปรุงใน [frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx)**:
    - เพิ่มคลาส `font-display` ในระดับคอนเทนเนอร์หลัก `<main className="font-display ...">`
    - ปรับแก้หัวข้อ `<h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-display font-bold text-gray-900 tracking-tight whitespace-nowrap">` เอาคลาส `truncate` ออกเพื่อแสดงข้อความเต็ม 100%
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests (`npx vitest run`): ผ่านทั้งหมด 84/84 tests (100% PASS)
- **ปรับแต่งดีไซน์ส่วนหัวหน้าสต็อก (Inventory Header Layout) สำหรับ Role Supervisor ให้เรียงเป็น 1 แถวดั้งเดิมโดยไม่ตกขอบ (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ปรับแต่งตามความต้องการของผู้ใช้งาน ให้คงการวางข้อความหัวข้อ `จัดการสต็อกบรรจุภัณฑ์ (Packaging Stock)` และปุ่ม Action ต่าง ๆ ในส่วนหัวของหน้าสต็อก ([frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx)) ให้อยู่ใน **บรรทัดเดียวกัน (Single Row)** เสมอ โดยปรับขนาดตัวอักษร, Padding และความกว้างของช่องค้นหาให้อยู่ในสัดส่วนที่พอดี (Responsive Compact Sizing) ทำให้ไม่ดันทะลุหรือตกขอบจอด้านขวาเมื่อเข้าใช้งานด้วยบทบาท Supervisor
  - **การปรับปรุงใน [frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx)**:
    - **ข้อความหัวข้อ**: ใช้ `text-lg sm:text-xl md:text-2xl lg:text-3xl truncate` วางเรียงบรรทัดเดียวดั้งเดิม
    - **กลุ่มปุ่มและฟอร์มค้นหาด้านขวา**: ปรับเป็น `flex items-center gap-2 lg:gap-2.5 shrink-0 flex-nowrap` โดยย่อปุ่ม "ประวัติแก้ไข", ปุ่ม "เพิ่มสินค้าใหม่" (ของ Supervisor) และช่องค้นหา (`w-36 sm:w-44 md:w-48 lg:w-56 xl:w-60`) ให้กระชับ ได้สัดส่วน และไม่หลุดขอบจอ
    - **คอนเทนเนอร์หลัก (`<main>`)**: ป้องกัน Horizontal Clipping ด้วย `w-full max-w-full overflow-x-hidden`
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests (`npx vitest run`): ผ่านทั้งหมด 84/84 tests (100% PASS)
- **ยกเลิกการปรับแต่งการจัดวางหน้าสต็อก (Revert Inventory Page Layout) ตามคำขอของผู้ใช้ (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ตามคำขอของผู้ใช้งาน ให้ยกเลิกการแก้ไขการจัดวางในหน้าสต็อก ([frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx)) และคืนค่าโครงสร้างการจัดเรียงดั้งเดิมทั้งหมดของหน้าสต็อกกลับมา 100%
  - **การดำเนินการ**: ย้อนคืนไฟล์ `frontend/app/inventory/page.tsx` กลับสู่เวอร์ชันดั้งเดิม หัวข้อ `จัดการสต็อกบรรจุภัณฑ์ (Packaging Stock)` และการจัดวางส่วนหัวกลับมาแสดงในบรรทัดเดียวกันตามรูปแบบเดิมทุกประการ
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests (`npx vitest run`): ผ่านทั้งหมด 84/84 tests (100% PASS)
- **ปรับแต่งฟอนต์การแสดงผลทั้งหมดของ Role Supervisor ให้ตรงกับฟอนต์แถบเมนู (Prompt) (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ปรับแต่งตามคำขอของผู้ใช้งาน ให้องค์ประกอบหน้าจอทั้งหมดในมุมมองของ Supervisor (รวมถึงเนื้อหา, หัวข้อการ์ด, ตาราง, ปุ่มกด, และข้อความในหน้าต่างต่าง ๆ) แสดงผลด้วยฟอนต์ **Prompt (`--font-prompt-sans`)** เดียวกันกับแถบเมนูข้าง (Navigation Sidebar) เพื่อความเป็นเอกภาพและสวยงามอ่านง่ายทั่วทั้งหน้าจอ
  - **การปรับปรุงใน [frontend/app/globals.css](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/globals.css)**:
    - เพิ่มคลาสยูทิลิตี้ `--font-prompt` และ `.font-prompt`
    - บังคับการใช้ฟอนต์ `Prompt` ให้กับแท็ก HTML ทั้งหมด (`*, *::before, *::after, body, h1..h6, p, span, a, li, div, button, input, select, textarea, table, th, td`) ผ่านกฎ CSS `font-family: var(--font-prompt-sans), "Prompt", ... !important;`
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests (`npx vitest run`): ผ่านทั้งหมด 84/84 tests (100% PASS)
- **ตรวจสอบและยืนยันรหัสผ่านเข้าสู่ระบบสำหรับ Role Supervisor (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ตรวจสอบข้อมูลบัญชีผู้ใช้งานบทบาทหัวหน้างาน (Supervisor) ในระบบฐานข้อมูลจริง เพื่อตอบคำถามผู้ใช้งานและให้สามารถเข้าสู่ระบบเพื่อใช้งานและทดสอบได้อย่างถูกต้อง
  - **ข้อมูลบัญชี Supervisor ที่มีในระบบ**:
    1. **บัญชีหลัก**: Username: `supervisor` | Password: `super1234` | Full Name: `ผู้ควบคุมดูแลระบบ (Supervisor)` | Status: `approved`
    2. **บัญชีทดสอบ**: Username: `testmanager` | Password: `password123` | Full Name: `Test Manager` | Status: `approved`
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - ทดสอบเรียก API `POST /auth/login` ทั้งสองบัญชี ได้รับ JWT Token และข้อมูลสิทธิ์ `role: "supervisor"` ถูกต้อง 100%
    - รันการทดสอบ Unit Tests (`npm test`): ผ่านครบทั้ง 84/84 tests (100% PASS)
- **ปรับสีข้อความกำกับ "Item Code", "จำนวน", และ "ผู้สร้างรายการ" ในหน้ารายการ ให้เป็นสีเดียวกับ "บรรจุภัณฑ์ทั้งหมด" ในหน้าสต็อก (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ตามความต้องการของผู้ใช้งาน ให้ปรับสีของข้อความหัวข้อย่อยในกล่องข้อมูลรายการธุรกรรม ([frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx)) ได้แก่ **"Item Code"**, **"จำนวน"**, และ **"ผู้สร้างรายการ"** จากเดิมที่เป็นสีเทาอ่อนจาง `text-slate-400` ให้เปลี่ยนเป็นสีเดียวกับป้ายกำกับการ์ด **"บรรจุภัณฑ์ทั้งหมด"** ในหน้าสต็อก ([frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx)) ซึ่งใช้ `text-gray-500 font-medium` ทำให้อ่านง่าย ชัดเจน และมีมาตรฐานโทนสีเดียวกันทั่วทั้งระบบ
  - **การปรับปรุงใน [frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx)**:
    - ปรับคลาสของหัวข้อทั้ง 3 ส่วน:
      - `Item Code`: `<span className="text-gray-500 font-medium text-[11px] uppercase tracking-wider block mb-0.5">Item Code</span>`
      - `จำนวน`: `<span className="text-gray-500 font-medium text-[11px] uppercase tracking-wider block mb-0.5">จำนวน</span>`
      - `ผู้สร้างรายการ`: `<span className="text-gray-500 font-medium text-[11px] uppercase tracking-wider block mb-0.5">ผู้สร้างรายการ</span>`
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests (`npm test`): ผ่านทั้งหมด 84/84 tests (100% PASS)
- **ปรับแต่งหน้ารายการ (Transactions Page) ให้คำว่า "รับเข้า" และ "อนุมัติแล้ว" เป็นตัวหนังสือสีเขียวไม่มีไฮไลท์ (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ตามความต้องการของผู้ใช้งาน ให้ปรับการแสดงผลในหน้ารายการธุรกรรม ([frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx)) ในส่วนประเภทรายการคำว่า **"รับเข้า"** และส่วนสถานะคำว่า **"อนุมัติแล้ว"** ให้แสดงเป็นตัวหนังสือสีเขียวเรียบง่าย (`font-medium text-emerald-600`) โดยไม่มีการไฮไลท์พื้นหลังหรือเส้นขอบกรอบ เพื่อความสะอาดตาและเป็นไปในแนวทางเดียวกันกับหน้าแดชบอร์ดและหน้ารายงาน
  - **การปรับปรุงใน [frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx)**:
    - **ประเภท (Type)**: ปรับคำว่า `"รับเข้า"` จากเดิมที่เป็น Badge แคปซูล `bg-green-50 border border-green-100 text-green-700` เป็น `<span className="text-xs sm:text-sm font-medium text-emerald-600">รับเข้า</span>` แบบตัวหนังสือสีเขียวไม่มีพื้นหลังไฮไลท์
    - **สถานะ (Status)**: ปรับคำว่า `"อนุมัติแล้ว"` จากเดิมที่เป็นกล่อง Badge ไฮไลท์ `bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-bold text-emerald-700` พร้อมไอคอนติ๊กถูก เป็นข้อความตัวหนังสือสีเขียว `<span className="text-xs sm:text-sm font-medium text-emerald-600">อนุมัติแล้ว</span>` ใน container ที่ไม่มีพื้นหลัง ไม่มีขอบ และไม่มีเงา
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests (`npm test`): ผ่านทั้งหมด 84/84 tests (100% PASS)
- **ปรับแต่งประเภทและสถานะในหน้ารายงาน (Reports Page) ของพนักงาน (Staff) เป็นตัวหนังสือสีเขียวไม่มีไฮไลท์ (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ตามความต้องการของผู้ใช้งาน ให้ปรับการแสดงผลในหน้ารายงานธุรกรรม ([frontend/app/reports/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/reports/page.tsx)) สำหรับผู้ใช้งานบทบาทพนักงานคลัง (Staff / `warehouse_staff`) โดยในส่วน **ประเภท** ให้คำว่า **"รับเข้า"** และส่วน **สถานะ** ให้คำว่า **"ยืนยันแล้ว"** แสดงเป็นตัวหนังสือสีเขียวเรียบง่าย (`font-medium text-emerald-600`) โดยไม่ต้องมีพื้นหลังหรือเส้นขอบไฮไลท์ (No highlight badge) เช่นเดียวกับบนตารางหน้า Dashboard
  - **การปรับปรุงใน [frontend/app/reports/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/reports/page.tsx)**:
    - เพิ่มตัวแปร `isStaff = currentUser?.role === 'warehouse_staff'`
    - **คอลัมน์ประเภท (Type)**:
      - เมื่อเป็นพนักงาน (`isStaff`) และรายการเป็น `receive`: แสดง `<span className="font-medium text-emerald-600 text-xs sm:text-sm">รับเข้า</span>` แบบตัวหนังสือสีเขียวไม่มีไฮไลท์พื้นหลัง
      - เมื่อเป็นบทบาทอื่น (Supervisor / Admin): แสดง Badge แคปซูลตามปกติ
    - **คอลัมน์สถานะ (Status)**:
      - เมื่อเป็นพนักงาน (`isStaff`) และสถานะเป็น `confirmed`: แสดง `<span className="font-medium text-emerald-600 text-xs sm:text-sm">ยืนยันแล้ว</span>` แบบตัวหนังสือสีเขียวไม่มีไฮไลท์พื้นหลัง
      - เมื่อเป็นบทบาทอื่น: แสดง Badge แคปซูลพร้อมไอคอนติ๊กถูกตามปกติ
      - ปรับสถานะ `rejected` ให้ใช้โทนสีแดงหลักของระบบ `bg-red-50 text-[#BE1111] border-red-200/80`
    - **มุมมองการ์ดบนมือถือ (Mobile View)**:
      - ปรับให้สถานะ `confirmed` สำหรับพนักงานแสดงเป็นข้อความสีเขียวไม่มีพื้นหลังไฮไลท์เช่นเดียวกัน
  - **การเพิ่ม Unit Test ใน [frontend/__tests__/unit/reports-export.test.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/unit/reports-export.test.tsx)**:
    - Test 17: ตรวจสอบว่าพนักงาน (Staff) มองเห็น "รับเข้า" และ "ยืนยันแล้ว" เป็นตัวหนังสือสีเขียว `text-emerald-600` และไม่มีพื้นหลัง `bg-emerald-50`
    - Test 18: ตรวจสอบว่าหัวหน้างาน (Supervisor) ยังคงมองเห็นเป็น Badge ไฮไลท์ `bg-emerald-50` ตามปกติ
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests (`npm test`): ผ่านทั้งหมด 84/84 tests (100% PASS)
- **ปรับโทนสีแดงบนหน้าแดชบอร์ด (Dashboard) ให้เป็นโทนสีแดงหลักของระบบ (#BE1111) ทั้งหมด (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ปรับสีองค์ประกอบโทนแดงทั้งหมดบนแดชบอร์ด (Dashboard) ทุก Role (Staff, Supervisor, Admin) ให้ตรงตามธีมสีแดงหลักของระบบ WPK MMS (`#BE1111`) เพื่อความเป็นเอกภาพ (Brand Consistency) ทั่วทั้งระบบ โดยคงความนุ่มนวลของพื้นหลังการ์ด/Badge ด้วย `bg-red-50` และเส้นขอบ `border-red-100/80`
  - **การปรับปรุงใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - **Admin Dashboard**:
      - Badge "SYSTEM ADMINISTRATION" และ Badge บทบาทผู้ดูแลระบบ (Admin): ปรับเป็น `bg-red-50 text-[#BE1111] border-red-200/80`
      - Badge บัญชีที่ถูกระงับ (Disabled/Suspended Status): ปรับเป็น `bg-red-50 text-[#BE1111] border-red-200/80` พร้อมตัวเลขสถิติ `text-[#BE1111]`
      - ไอคอนส่วนหัวและไอคอนภาพรวมผู้ใช้งาน Admin: `bg-red-50 text-[#BE1111]`
      - ปุ่ม "จัดการผู้ใช้งาน": สีแดงของระบบ `bg-[#BE1111] hover:bg-[#a00e0e]`
    - **Staff Dashboard & My Activity Header**:
      - ไอคอนส่วนหัวและ Badge "สถิติเฉพาะบุคคล": `bg-red-50 text-[#BE1111]`
      - การ์ดสถิติ "คุณเบิกออกวันนี้" / "เบิกออกวันนี้": ไอคอน `bg-red-50 border-red-100 text-[#BE1111]` และตัวเลขการเปลี่ยนแปลง `text-[#BE1111]`
      - การ์ดสถิติ "สต็อกใกล้หมด" (Low Stock Alert): ไอคอน `bg-red-50 border-red-100 text-[#BE1111]` และตัวเลข `text-[#BE1111]`
    - **กราฟสรุปการทำงาน 7 วันล่าสุด (7-Day Trend Chart)**:
      - ไอคอนหัวข้อกราฟ: `bg-red-50 border-red-100/80 text-[#BE1111]`
      - Mini KPI Card "เบิกออกทั้งหมด": ไอคอน `bg-[#BE1111] text-white` และ Badge เปรียบเทียบ `text-[#BE1111] bg-red-100/60`
      - แท่งกราฟรายการเบิกออก, ตัวเลขกำกับแท่ง และจุด Legend: `#BE1111` พร้อมเอฟเฟกต์ Hover `group-hover:bg-[#a00e0e]`
    - **Action Required (งานที่ต้องดำเนินการ) & เมนูด่วน (Quick Action)**:
      - ไอคอนรายการเบิกออกรอดำเนินการ: `bg-red-50 text-[#BE1111]`
      - ลิงก์ "ตรวจ" และ "ดูรายการรอดำเนินการทั้งหมด": `text-[#BE1111] hover:text-[#a00e0e]`
      - Quick Action "เบิกออกสินค้า": กล่อง `bg-red-50/70 border-red-100/80 text-[#BE1111] hover:bg-red-100/70`, ไอคอน `bg-[#BE1111] text-white`, ลูกศร `text-[#BE1111]`
    - **ตารางประวัติรายการล่าสุด (Recent Transactions Table) & Pagination**:
      - ลิงก์ "ดูทั้งหมด": `text-[#BE1111] hover:text-[#a00e0e]`
      - Badge "เบิกออก": `bg-red-50 text-[#BE1111] border-red-200/80`
      - Badge "ปฏิเสธแล้ว": `bg-red-50 text-[#BE1111] border-red-200/80` พร้อมไอคอน `text-[#BE1111]`
      - ปุ่มเลขหน้า Active ในระบบแบ่งหน้า Pagination: `bg-[#BE1111] hover:bg-[#a00e0e] text-white shadow-xs`
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests (`npm test`): 82/82 ผ่านทั้งหมด (100% PASS)
- **ปรับแต่งชุดสีองค์ประกอบทั้งหน้าแดชบอร์ด (Dashboard) ให้เป็นโทนพาสเทลนุ่มนวล สบายตาทั้งหมด (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ปรับสีองค์ประกอบทั้งหมดบนหน้า Dashboard ทุก Role (Staff, Supervisor, Admin) จากสีเข้มจัดหรือสีแดงเข้ม ให้เป็นโทนพาสเทลนุ่มนวล สดใส สบายตา เข้าชุดกันอย่างกลมกลืน (Soft Modern Pastel)
  - **การปรับปรุงใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - **Header & 3 การ์ดสถิติ My Activity**: ปรับไอคอนและ Badge ให้เป็นโทน Rose พาสเทล (`bg-rose-50 text-rose-500`), Emerald พาสเทล (`bg-emerald-50 text-emerald-500`) และ Amber พาสเทล (`bg-amber-50 text-amber-500`)
    - **Warehouse Overview (ภาพรวมคลังสินค้า)**:
      - ปรับไอคอนและ Badge เป็นโทน Violet พาสเทล (`bg-violet-50 text-violet-500`, `bg-violet-50/70 text-violet-700`), Sky Blue พาสเทล (`bg-sky-50 text-sky-500`), และ Rose พาสเทล (`bg-rose-50 text-rose-500`)
    - **กราฟแท่งสรุปการทำงาน 7 วันล่าสุด**:
      - แท่งรับเข้า & จุด Legend: `#34D399` (Soft Pastel Mint)
      - แท่งเบิกออก & จุด Legend: `#FB7185` (Soft Pastel Rose)
      - Mini KPI Cards และแถบสรุปสถิติด้านล่างใช้โทน Violet พาสเทล (`bg-violet-50/40 text-violet-500`)
    - **กราฟสัดส่วนวัตถุดิบบรรจุภัณฑ์ (Donut Chart)**:
      - แกลลอน (Gallon): `#34D399` (Pastel Mint)
      - ฝา (Cap): `#60A5FA` (Pastel Sky Blue)
      - ฟอยล์ (Foil): `#A78BFA` (Pastel Lavender)
      - กล่อง (Box): `#F472B6` (Pastel Coral Pink)
      - ฉลาก (Label): `#5EEAD4` (Pastel Seafoam Teal)
      - อื่นๆ (Other): `#94A3B8` (Pastel Slate)
    - **Supervisor Quick Actions (เมนูด่วน)**:
      - รับเข้าสินค้า: ไอคอน `#34D399`, กล่อง `bg-emerald-50/70`
      - เบิกออกสินค้า: ไอคอน `#FB7185`, กล่อง `bg-rose-50/70 text-rose-800` (เปลี่ยนจากสีแดงเข้ม `#BE1111`)
      - สต็อกสินค้า: ไอคอน `#A78BFA`, กล่อง `bg-violet-50/70 text-violet-800`
      - ดูรายงานทั้งหมด: ไอคอน `bg-slate-400`, กล่อง `bg-slate-50 text-slate-700`
    - **Admin Dashboard**:
      - ปรับ Badge "SYSTEM ADMINISTRATION" และ Badge บทบาท Admin เป็น Soft Pastel Rose (`bg-rose-50 text-rose-700 border-rose-200/80`)
      - กราฟแท่งเปรียบเทียบบทบาทผู้ใช้งาน: ปรับแท่งเดือนปัจจุบันจากน้ำเงินเข้ม `#4F46E5` เป็น Pastel Indigo `#818CF8`
    - **Action Required & Recent Transactions Table**:
      - ลิงก์ปุ่มตรวจ / ดูทั้งหมด / ดูรายการค้าง ปรับเป็นสี Rose นุ่มนวล (`text-rose-600 hover:text-rose-700`)
      - Badge "เบิกออก", "ยืนยันแล้ว", "ปฏิเสธแล้ว", "รอการยืนยัน" ใช้โทนสีพาสเทลนุ่มนวล
      - ปุ่มเลขหน้า Active ใน Pagination ใช้สี Rose นุ่มนวล (`bg-rose-500 text-white shadow-xs`)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 82/82 ผ่านทั้งหมด (100% PASS)

- **ปรับชุดสีของกราฟสัดส่วนวัตถุดิบบรรจุภัณฑ์ (Donut Chart) เป็นสีพาสเทลนุ่มนวล (Soft Modern Pastel) (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ปรับสีของกราฟสัดส่วนวัตถุดิบบรรจุภัณฑ์บน Dashboard ให้เป็นโทนสีพาสเทลอ่อนสบายตา ไม่เข้มจัด เพื่อความสวยงาม นุ่มนวล และอ่านง่ายบนพื้นหลังสีขาว
  - **การปรับปรุงใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - อัปเดตค่าสีในอาร์เรย์ `categoriesDef`:
      - แกลลอน (Gallon): `#34D399` (Soft Pastel Mint)
      - ฝา (Cap): `#60A5FA` (Soft Pastel Sky Blue)
      - ฟอยล์ (Foil): `#A78BFA` (Soft Pastel Lavender)
      - กล่อง (Box): `#F472B6` (Soft Pastel Coral Pink)
      - ฉลาก (Label): `#5EEAD4` (Soft Pastel Seafoam Teal)
      - อื่นๆ (Other): `#94A3B8` (Soft Pastel Slate)
    - ส่งผลให้ทั้งวงแหวน Donut Chart และจุดแสดงสัญลักษณ์ (Legend) บนแดชบอร์ดของทั้ง Staff และ Supervisor แสดงผลด้วยโทนสีพาสเทลใหม่ทันที
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 82/82 ผ่านทั้งหมด (100% PASS)

- **พัฒนาระบบแบ่งหน้า (Pagination) หน้าละ 5 รายการ ในตารางรายการล่าสุดบน Dashboard (Staff & Supervisor) (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ปรับปรุงให้ตารางประวัติการทำรายการล่าสุดบนหน้า Dashboard สามารถเปิดดูรายการย้อนหลังหน้าละ 5 รายการได้อย่างสะดวก ทั้งในมุมมองของพนักงาน (Staff) และหัวหน้างาน (Supervisor) โดยปรับ Subtitle ใต้หัวข้อให้ตรงตามจริง และมีแถบควบคุมหน้าที่แสดงสรุปจำนวนรายการอย่างชัดเจน
  - **การปรับปรุงใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - เพิ่ม State `recentTxPage` และตัวแปร `RECENT_TX_PER_PAGE = 5` เพื่อตัดแบ่งชุดข้อมูล (Slice) ตามหน้าปัจจุบัน
    - ปรับ Subtitle ใต้หัวข้อตารางให้กระชับ: `"ประวัติการทำรายการล่าสุดของคุณ"` (Staff) และ `"ประวัติการทำรายการล่าสุดในระบบ"` (Supervisor)
    - เพิ่ม Pagination Controls Footer ด้านล่างตาราง:
      - แสดงข้อความสรุปช่วงข้อมูล เช่น `"แสดง 1 - 5 จากทั้งหมด 12 รายการ"` (หรือ `"แสดง 1 จากทั้งหมด 1 รายการ"` หากมี 1 รายการ)
      - แสดงแถบควบคุมปุ่มเปลี่ยนหน้าเสมอ (ปุ่ม "ก่อนหน้า", ปุ่มเลขหน้า "1", "2"..., และปุ่ม "ถัดไป") โดยมีสถานะ Disabled ชัดเจนเมื่อเป็นหน้าแรกหรือหน้าสุดท้าย เพื่อให้ผู้ใช้งานมองเห็นฟังก์ชันแบ่งหน้าได้อย่างชัดเจนแม้มีข้อมูลหน้าเดียว
  - **การอัปเดต Unit Tests ใน [frontend/__tests__/unit/dashboard.test.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/unit/dashboard.test.tsx)**:
    - อัปเดต Subtitle Expectations และเพิ่ม Test Case ตรวจสอบการทำงานของ Pagination เมื่อมีมากกว่า 5 รายการ
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 82/82 ผ่านทั้งหมด (100% PASS)

- **ปรับแต่งการแสดงผลสถานะ "ยืนยันแล้ว" และประเภท "รับเข้า" ในตาราง "รายการของคุณล่าสุด" ของ Staff Dashboard (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ปรับตามความต้องการของผู้ใช้งาน โดยในหน้า Dashboard ของ Role Staff (พนักงาน) ส่วนตาราง "รายการของคุณล่าสุด" (Recent Transactions) ตรงคอลัมน์ "ประเภท" คำว่า "รับเข้า" และคอลัมน์ "สถานะ" คำว่า "ยืนยันแล้ว" ไม่ต้องมีพื้นหลังไฮไลท์เป็น Badge แต่ให้แสดงเป็นตัวหนังสือสีเขียว (`text-emerald-600 font-medium`) แบบเรียบง่าย ชัดเจน และอ่านสบายตา
  - **การปรับปรุงใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - ในตาราง Recent Transactions ตรวจสอบเงื่อนไข `isStaff && tx.type === 'receive'` และ `isStaff && tx.status === 'confirmed'`
    - สำหรับรายการรับเข้าของพนักงาน จะแสดงผลเป็น `<span className="font-medium text-emerald-600 text-xs sm:text-sm">รับเข้า</span>`
    - สำหรับสถานะยืนยันแล้วของพนักงาน จะแสดงผลเป็น `<span className="font-medium text-emerald-600 text-xs sm:text-sm">ยืนยันแล้ว</span>` โดยไม่มี background badge (`bg-emerald-500/10`, border, rounded-full, shadow, icon)
    - กรณี Role อื่น (Supervisor/Admin) หรือสถานะ/ประเภทอื่นๆ ยังคงรูปแบบเดิม 100%
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)

- **ปรับปรุง Layout ของ Staff Dashboard โดยย้าย Section "งานที่ต้องดำเนินการ (Action Required)" ไปอยู่ภายในกรอบเดียวกับ "สัดส่วนวัตถุดิบบรรจุภัณฑ์ (Packaging Distribution)" (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ปรับการจัดวางพื้นที่ของ Staff Dashboard ให้กระชับ สวยงาม และสมดุลมากยิ่งขึ้น โดยรวมกลุ่มข้อมูลการติดตามด้านขวา (Packaging Distribution ด้านบน + Action Required ด้านล่าง) ให้อยู่ใน Container เดียวกัน และให้ Section "สรุปการทำงานของคุณ 7 วันล่าสุด" อยู่ด้านซ้ายแบบ 2 คอลัมน์สมดุล (7 Cols / 5 Cols) ไม่ต้องมี Action Required เป็น Card เต็มความกว้างคั่นกลาง
  - **โครงสร้าง Layout หลังการปรับปรุงใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - **Top**: สถิติการทำงานของฉัน 3 การ์ด + ภาพรวมคลังสินค้า 3 การ์ด (คงเดิม)
    - **Middle Row (2 Columns)**:
      - *ฝั่งซ้าย (`lg:col-span-7`)*: สรุปการทำงานของคุณ 7 วันล่าสุด (Grouped Bar Chart, Mini KPI รับเข้า-เบิกออก, และแถบสรุปยอดรวม 7 วัน)
      - *ฝั่งขวา (`lg:col-span-5` - กรอบรวมเดียว)*:
        - **ส่วนบน**: สัดส่วนวัตถุดิบบรรจุภัณฑ์ (Donut Chart + ยอดรวมตรงกลาง + Legend แสดงจำนวนและ %)
        - **เส้นคั่น (Divider)**: `<hr className="border-slate-100 my-4" />`
        - **ส่วนล่าง**: งานที่ต้องดำเนินการ (Action Required: แสดง Empty State เมื่อไม่มีงานค้าง หรือรายการรอดำเนินการของตนเอง 2 รายการแรกพร้อมปุ่มตรวจสอบ)
    - **Bottom**: รายการของคุณล่าสุด (Recent Transactions 5 รายการล่าสุด แบบ Full-width ตาราง คงเดิม)
  - **การคงสภาพและไม่ส่งผลกระทบต่อระบบส่วนอื่น (Zero Impact)**:
    - คง Business Logic เดิมของ Packaging Distribution และ Action Required 100%
    - Staff Data Isolation (`whereClause.createdById = req.user.id`) และ RBAC คงเดิม 100%
    - ไม่กระทบหน้า Dashboard ของ Supervisor หรือ Admin แต่อย่างใด
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors (Exit code 0)
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)

- **ปรับปรุง Staff Dashboard โดยนำ Section "เมนูด่วน (Quick Action)" ออกจาก Dashboard (เสร็จสมบูรณ์ 100%)**:
  - **เหตุผลและเป้าหมาย**: ลดความซ้ำซ้อนของ Navigation บน Staff Dashboard เนื่องจากฟังก์ชันใน Quick Action (รับเข้าสินค้า, เบิกออกสินค้า, สต็อกสินค้า, รายการของฉัน) สามารถเข้าถึงได้อย่างสะดวกจากแถบ Sidebar Navigation อยู่แล้ว และปรับให้แดชบอร์ดเน้นการแสดง "ข้อมูลที่ Staff ควรรู้" เป็นหลัก
  - **การปรับปรุงใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - นำบล็อก Section `เมนูด่วน (Quick Action)` ออกจากส่วนการแสดงผลของ Role `warehouse_staff` (Staff Dashboard)
    - ทำความสะอาด (Cleanup) ลบ Import ไอคอน `Zap` ที่ไม่ได้ใช้งานออกจากหัวไฟล์
    - จัดระเบียบระยะห่าง Spacing / Grid Layout ให้เรียงลำดับอย่างสมดุล ได้แก่:
      1. Top KPI Summary (Packaging ทั้งหมด, จำนวนคงเหลือรวม, สต็อกใกล้หมด)
      2. My Activity (กราฟสรุปการทำงาน 7 วันล่าสุด) + Packaging Distribution (Donut Chart สัดส่วนวัตถุดิบบรรจุภัณฑ์)
      3. Action Required (งานที่ต้องดำเนินการ: แสดงรายการรอดำเนินการ หรือ Empty State สวยงามเมื่อไม่มีงานค้าง)
      4. Recent Transactions (รายการของคุณล่าสุด: ตารางประวัติการทำรายการ 5 รายการล่าสุด)
  - **การคงสภาพและไม่ส่งผลกระทบต่อระบบส่วนอื่น (Zero Impact)**:
    - ฟังก์ชันรับเข้าสินค้า (`/scan?mode=receive`), เบิกออกสินค้า (`/scan?mode=issue`), สต็อก (`/inventory`), และประวัติรายการ (`/transactions`) รวมถึง Sidebar Navigation ยังคงใช้งานได้ครบถ้วน 100%
    - Role Supervisor และ Admin Dashboard ไม่ได้รับผลกระทบใดๆ (Supervisor Dashboard ยังคงมี Quick Action ตามเดิม)
    - สิทธิ์ RBAC, Data Isolation (`whereClause.createdById = req.user.id`), Backend API และ Database schema ไม่มีการเปลี่ยนแปลง
  - **การอัปเดต Unit Tests ใน [frontend/__tests__/unit/dashboard.test.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/unit/dashboard.test.tsx)**:
    - อัปเดต Assertion ตรวจสอบว่า Staff Dashboard จะต้องไม่มี `เมนูด่วน (Quick Action)` แสดงผล
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Browser Subagent UI Verification: บันทึกภาพหน้าจอจริงทั้ง Desktop (1440px) และ Mobile (390px) ตรวจสอบความถูกต้อง ระยะห่างสมดุล ไม่มี Horizontal Overflow หรือช่องว่างผิดปกติ

- **ปรับปรุงและตรวจสอบหน้าแดชบอร์ด (Dashboard) สำหรับ Role: Staff (พนักงานทั่วไป) ในระบบ WPK MMS ครบถ้วนทุกข้อกำหนด (เสร็จสมบูรณ์ 100%)**:
  - **การตรวจสอบและการนำไปใช้ (Audit & Implementation) ใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - **1. โครงสร้างหลัก 5 ส่วน (A ถึง E) ตอบโจทย์ 3 เรื่องหลักของ Staff**:
      - *ฉันทำงานอะไรไปแล้ว?* -> ดูกราฟ "สรุปการทำงานของคุณ 7 วันล่าสุด", Mini KPI รับเข้า-เบิกออก และตารางประวัติธุรกรรมล่าสุด
      - *ตอนนี้มีข้อมูลสต็อกอะไรที่ฉันควรรู้?* -> ดูการ์ด KPI ด้านบน ("Packaging ทั้งหมด", "จำนวนคงเหลือรวม", "สต็อกใกล้หมด") และ Donut Chart "สัดส่วนวัตถุดิบบรรจุภัณฑ์"
      - *ฉันต้องดำเนินการอะไรต่อ?* -> ดูส่วน "งานที่ต้องดำเนินการ (Action Required)" และ "เมนูด่วน (Quick Action)"
    - **2. Top Summary / KPI Cards**:
      - แสดงการ์ดสถิติ Packaging ทั้งหมด, จำนวนคงเหลือรวม (หน่วย ชิ้น / หน่วย), และการ์ดสต็อกใกล้หมด (เตือนเมื่อ quantity <= minStock) โดยดึงจาก API จริง ไม่มีการ Hardcode
    - **3. My Activity Grouped Bar Chart & Mini Summary Cards**:
      - แสดงกราฟแท่งเปรียบเทียบ 2 Series: เขียว (`#10B981`) สำหรับ "รับเข้า" และ แดง (`#EF4444`) สำหรับ "เบิกออก"
      - แกน X ย้อนหลัง 7 วัน (9 - 15 ก.ย.) และแกน Y "จำนวนรายการ" (ระดับ 8, 6, 4, 2, 0)
      - มี 2 Mini KPI Cards เหนือกราฟ ("รับเข้าทั้งหมด", "เบิกออกทั้งหมด") พร้อม Trend จริง และแบนเนอร์สรุปยอดรวมด้านล่าง
    - **4. Packaging Material Distribution (Donut Chart)**:
      - แสดงสัดส่วน Packaging แต่ละประเภท (แกลลอน, ฝา, ฟอยล์, กล่อง, ฉลาก) ยอดรวมตรงกลาง และ Legend แสดงจำนวน + % จากข้อมูลจริง
    - **5. งานที่ต้องดำเนินการ (Pending / Action Required)**:
      - เพิ่มกล่องแสดงรายการงานที่รอดำเนินการ (`status === 'pending'`) ของ Staff
      - รองรับ **Empty State** สวยงาม เมื่อไม่มีงานค้าง: แสดงไอคอนเครื่องหมายถูกสีเขียว, ข้อความ *"ไม่มีรายการที่ต้องดำเนินการ"*, *"ขณะนี้ไม่มีงานค้าง หรือรายการของคุณที่รอดำเนินการในระบบ"* และ Badge *"สถานะเรียบร้อย"*
    - **6. เมนูด่วน (Quick Actions)**:
      - แถบปุ่มลัด 4 การ์ดแนวนอน: **รับเข้าสินค้า** (`/scan?mode=receive`), **เบิกออกสินค้า** (`/scan?mode=issue`), **สต็อกสินค้า** (`/inventory`), และ **ดูรายการของฉัน** (`/transactions`)
    - **7. การรักษาความปลอดภัยและขอบเขตสิทธิ์ (RBAC & Data Scope)**:
      - ข้อมูลกิจกรรมแสดงเฉพาะของ Staff ที่ Login อยู่ (`whereClause.createdById = req.user.id` + Frontend validation)
      - ไม่กระทบหน้า Dashboard ของ Supervisor หรือ Admin แต่อย่างใด
      - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Browser Subagent Verification: บันทึกภาพหน้าจอจริง ตรวจสอบทุก Section แสดงผลถูกต้อง ครบถ้วน ตรงตาม Design System WPK MMS 100%

- **ปรับเปลี่ยนดีไซน์กราฟสรุปการทำงาน 7 วันล่าสุดในหน้าแดชบอร์ด (Dashboard) ของ Role พนักงาน (Staff) ตามรูปต้นแบบ (เสร็จสมบูรณ์ 100%)**:
  - **การปรับแต่งใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - **Header & Date Range Pill**: เพิ่มไอคอนกราฟแท่งสีแดง (`BarChart3` ในกล่อง `bg-red-50 text-[#BE1111]`), หัวข้อ "สรุปการทำงานของคุณ 7 วันล่าสุด", คำบรรยาย "เปรียบเทียบจำนวนรายการที่คุณรับเข้าและเบิกออกในแต่ละวัน" พร้อมป้ายระบุช่วงวันที่ 7 วันจริง (เช่น `9 - 15 ก.ย. 2569`) ด้านขวาบน
    - **2 Mini KPI Summary Cards**:
      - การ์ด "รับเข้าทั้งหมด": กล่องสีเขียวมิ้นต์อ่อน (`bg-emerald-50/50`) พร้อมไอคอนดาวน์โหลดรับเข้า, สรุปยอดรวมรายการรับเข้า 7 วัน, และเปอร์เซ็นต์แนวโน้มเปรียบเทียบจากสัปดาห์ก่อนหน้า
      - การ์ด "เบิกออกทั้งหมด": กล่องสีแดงพีชอ่อน (`bg-rose-50/50`) พร้อมไอคอนอัปโหลดเบิกออก, สรุปยอดรวมรายการเบิกออก 7 วัน, และเปอร์เซ็นต์แนวโน้มเปรียบเทียบจากสัปดาห์ก่อนหน้า
    - **Grouped Bar Chart (SVG) & Dashed Grid Lines**:
      - แสดงเส้นกริดประแนวนอนและสเกลแกน Y ระดับ 8, 6, 4, 2, 0 พร้อมป้ายกำกับ "จำนวนรายการ"
      - แสดงแท่งกราฟคู่แยกตาม 7 วันล่าสุด (แท่งสีเขียวมรกต `#10B981` สำหรับรับเข้า และแท่งสีแดง `#EF4444` สำหรับเบิกออก) พร้อมตัวเลขกำกับบนยอดแท่งกราฟ และป้ายวันที่ภาษาไทยกำกับใต้แกน X
      - จัดวาง Legend แสดงสัญลักษณ์สี "🟢 รับเข้า / 🔴 เบิกออก" กึ่งกลางใต้กราฟอย่างสมดุล
    - **Total Summary Banner (ด้านล่างการ์ด)**:
      - เพิ่มกล่องแบนเนอร์สรุปสีม่วงลาเวนเดอร์อ่อน (`bg-indigo-50/40`) พร้อมไอคอนปฏิทิน สรุปยอดรวมรายการธุรกรรม 7 วันทั้งหมด และข้อความเปรียบเทียบกับสัปดาห์ก่อนหน้า พร้อมลูกศรนำทาง
    - **Layout จัดวางหน้าจอ**: จัดวางการ์ดกราฟ 7 วันล่าสุดเป็นคอลัมน์หลักฝั่งซ้าย (`lg:col-span-7`) ควบคู่กับ Donut Chart สัดส่วนบรรจุภัณฑ์และ Quick Actions ฝั่งขวา (`lg:col-span-5`) อย่างลงตัว สวยงาม และ Responsive ทุกขนาดหน้าจอ
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic Changes)**:
    - ไม่มีการเปลี่ยนแปลงสิทธิ์ RBAC, Security, การคำนวณข้อมูล หรือ Logic ของระบบใด ๆ
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Browser Subagent Verification: บันทึกภาพหน้าจอจริงในบทบาท Staff ยืนยันว่าการ์ดกราฟและเลย์เอาต์ตรงตามรูปต้นแบบ 100%

- **ปรับแต่งแบบอักษร (Typography) ในหน้า "รายงาน" (Reports) และหน้า "แดชบอร์ด" (Dashboard) ให้เป็นฟอนต์เดียวกับแถบเมนูนำทาง (Prompt) (เสร็จสมบูรณ์ 100%)**:
  - **การปรับแต่งใน [frontend/app/reports/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/reports/page.tsx) (หน้ารายงานธุรกรรม)**:
    - ปรับแต่งส่วนหัว "รายงานธุรกรรม", ตัวกรองช่วงเวลา (Dropdown และ Date Pickers), ตัวกรองสถานะ, ช่องค้นหารหัสชิ้นส่วน และปุ่ม "ส่งออก Excel" ให้ใช้ฟอนต์ Prompt น้ำหนัก `font-semibold` / `font-medium` สบายตา
    - ปรับปรุงแท็บหมวดหมู่ (Pill Tabs), ตารางแสดงประวัติธุรกรรม Desktop และการ์ดรายการมุมมอง Mobile รวมถึงป้ายกำกับหมายเหตุปรับปรุงสต็อก ให้ใช้ `font-semibold` / `font-medium` / `font-normal` สมดุลและชัดเจน
  - **การปรับแต่งใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx) (หน้าแดชบอร์ด Admin, Supervisor, Staff)**:
    - ปรับการ์ดสรุปสถิติ KPI บัญชีผู้ใช้, การ์ด Role Growth สรุปสถิติแต่ละบทบาท, กราฟ Bar Chart เปรียบเทียบเดือนก่อนและเดือนนี้, และการ์ดสถานะบริการของระบบ (System Status) ในมุมมอง Admin ให้ใช้ฟอนต์ Prompt ที่มีน้ำหนักตัวอักษรสม่ำเสมอ
    - ปรับปรุงการ์ดสถิติการทำงาน, กราฟสรุป 7 วันล่าสุด, Donut Chart สัดส่วนวัตถุดิบบรรจุภัณฑ์, ปุ่มลัดเมนูด่วน (Quick Actions) และตารางรายการล่าสุดของ Supervisor และ Staff ให้แสดงผลด้วยฟอนต์ Prompt เข้าคู่กับ Sidebar 100%
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic Changes)**:
    - ไม่มีการเปลี่ยนแปลงสิทธิ์ RBAC, Security, การส่งออก Excel, การคำนวณสถิติ หรือ API Handlers ใด ๆ ทั้งสิ้น
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)

- **ปรับแต่งแบบอักษร (Typography) ในส่วนของหน้า "สต็อก" (Inventory) สำหรับบทบาท พนักงาน (Staff) และทุกมุมมองให้เป็นฟอนต์เดียวกับแถบเมนูนำทาง (Prompt) (เสร็จสมบูรณ์ 100%)**:
  - **การปรับแต่งใน [frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx)**:
    - **ส่วนหัวและแท็บตัวกรอง (Header & Filter Tabs)**: ปรับหัวข้อ "สต็อกสินค้าคงคลัง", คำอธิบาย, แท็บตัวกรองหมวดหมู่บรรจุภัณฑ์ (`all`, `gallon`, `foil`, `cap`, `box`, `other`) และแท็บสถานะ (`all`, `active`, `inactive`) ให้ใช้ `font-semibold` / `font-medium` สบายตา ไร้การบีบอัดตัวอักษรภาษาไทย
    - **การ์ดและรายการสินค้า (Cards & Tables)**:
      - ปรับการ์ดสินค้าสำเร็จรูป (FG Parent Cards) และการ์ดบรรจุภัณฑ์ (Packaging Cards) ให้ชื่อสินค้า, รหัสสินค้า, ป้ายคลัง, จำนวนคงเหลือ และปุ่ม Action แสดงผลด้วยฟอนต์ Prompt น้ำหนักสมดุล (`font-semibold` / `font-medium`)
      - ปรับปรุงตารางสรุปหมวดหมู่, ตาราง Flat View List, และตาราง Unassigned Items ให้หัวตารางและเนื้อหาตารางแสดงผลตัวหนังสือภาษาไทยและตัวเลขอังกฤษคมชัด
    - **Modals ทั้งหมดในหน้าระบบสต็อก**:
      - ปรับปรุง Modal ยืนยันปรับจำนวนสต็อก (Quantity Edit Modal), Modal ยืนยันเปลี่ยนสถานะ (Status Toggle Modal), Modal ยืนยันการลบ (Delete Confirmation Modal), Modal แสดงสูตรการผลิต (BOM Recipe Modal), Modal ประวัติการเคลื่อนไหวตาม Lot (Lot Tracking Modal), และ Modal แสดง QR Code ขยายใหญ่ (QR Quick View Modal)
      - ปรับปรุง Modal เพิ่มสินค้าใหม่ (Add Product Modal) และ Modal ตั้งค่าจุดสั่งซื้อขั้นต่ำ (Min Stock Modal) โดยถอด `font-display`, `font-bold` ซ้อน และ `font-mono` บนข้อความทั่วไปออกทั้งหมด
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic & Role Changes)**:
    - ไม่มีการเปลี่ยนแปลงสิทธิ์ RBAC, Security, การคำนวณสต็อก, FIFO Logic หรือ API Handlers ใด ๆ ทั้งสิ้น
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)

- **ปรับแต่งแบบอักษร (Typography) ในส่วนของ Role พนักงาน (Staff) และหน้าจอที่เกี่ยวข้องทั้งหมดให้เป็นฟอนต์เดียวกับแถบเมนูนำทาง (Prompt) (เสร็จสมบูรณ์ 100%)**:
  - **การปรับแต่งใน [frontend/app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/page.tsx) (หน้าหลัก Staff)**:
    - ปรับแก้หัวข้อหลัก (`h2` "หน้าหลัก"), ข้อความต้อนรับ, และการ์ดเข้าถึงด่วน ("สแกนสินค้า", "จัดการสต็อก") ให้ใช้ `font-semibold` / `font-normal` โดยถอดคลาส `font-black`, `font-extrabold`, และ `tracking-tight` ออก เพื่อให้ตัวอักษรภาษาไทยแสดงผลด้วยฟอนต์ Prompt ที่โปร่ง อ่านง่าย และกลมกลืนกับแถบเมนูนำทาง (Sidebar)
    - ปรับปรุงการ์ด "ภาพรวมระบบ" และสถานะผู้ใช้ของ Staff ให้ใช้น้ำหนัก `font-semibold` และ `font-normal` ที่สมดุล
  - **การปรับแต่งใน [frontend/app/scan/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/scan/page.tsx) (หน้าสแกน QR Code)**:
    - ปรับแต่งหัวข้อ "สแกน QR Code สินค้า", ข้อมูลการสแกน, ป้ายสถานะการเคลื่อนไหว (รับเข้า/เบิกออก), รายละเอียดสต็อกคงเหลือ และ Modal แสดงสูตรโครงสร้าง (BOM) ให้ใช้ฟอนต์ Prompt น้ำหนัก `font-semibold` และ `font-medium` สวยงามคมชัด
  - **การปรับแต่งใน [frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx) (หน้ารายการของฉัน Staff)**:
    - ปรับแต่งหัวข้อ "รายการของฉัน", คำอธิบายย่อย, ตัวเลือก Dropdown สถานะ (`all`, `pending`, `confirmed`, `rejected`), ป้ายสถานะ และกล่องแสดงรายการของพนักงานให้ใช้ฟอนต์ Prompt สะอาดตา
  - **การปรับแต่งใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx) (หน้าแดชบอร์ด Staff)**:
    - ปรับแต่งส่วนมุมมองของ Staff ให้แสดงการ์ดสถิติการทำงานส่วนตัว, กิจกรรมล่าสุด, ป้ายสถานะ และ Action Links ให้ใช้ฟอนต์ Prompt ที่มีน้ำหนักสอดคล้องกับ Sidebar
  - **การปรับแต่งใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx)**:
    - ปรับแต่งการ์ดคู่มือการใช้งานสำหรับ Staff ในหน้าหลักให้ใช้ฟอนต์ Prompt น้ำหนัก `font-semibold` และ `font-normal`
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic & Role Changes)**:
    - ไม่มีการเปลี่ยนแปลงสิทธิ์ RBAC, Security, การคำนวณสต็อก หรือเงื่อนไขการทำงานใด ๆ ของ Staff
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Browser Subagent Verification: สลับบัญชีทดสอบในบทบาท Staff เข้าใช้งานหน้า `/`, `/scan`, `/transactions`, `/inventory`, `/dashboard` ยืนยันการแสดงผลฟอนต์ Prompt ที่สวยงาม สม่ำเสมอ และเข้าคู่กับแถบเมนูนำทาง 100%

- **ปรับเปลี่ยนแบบอักษร (Typography) ทั้งหมดให้เป็นฟอนต์เดียวกับแถบเมนูนำทาง (Prompt) อย่างสมบูรณ์ 100% (เสร็จสมบูรณ์ 100%)**:
  - **การปรับแต่งใน [frontend/app/globals.css](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/globals.css)**:
    - กำหนดกฎแบบอักษรครอบคลุมทุก Element ของเว็บแอป ทั้ง `body`, `button`, `input`, `select`, `textarea`, `optgroup`, `table`, `th`, `td` และยูทิลิตี้ `.font-display`, `.font-sans`, `.font-body` ให้ใช้ฟอนต์ **Prompt** (`var(--font-prompt-sans)`) อย่างเป็นหนึ่งเดียวทั่วทั้งระบบ ป้องกันไม่ให้ Form Controls หรือตารางหลุดไปใช้ฟอนต์ดีฟอลต์ของเบราว์เซอร์
    - เพิ่ม Fallback ให้กับ `--font-mono` ให้รองรับอักขระภาษาไทยด้วย Prompt
  - **การปรับแต่งใน [frontend/app/users/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/users/page.tsx)**:
    - ถอดคลาส `font-mono` ออกจากคอลัมน์ชื่อผู้ใช้ (Username) ในตาราง เพื่อให้ชื่อผู้ใช้ทั้งภาษาไทยและอังกฤษแสดงผลด้วยฟอนต์ Prompt ที่ละมุนและสวยงามเหมือนกับแถบเมนู
  - **การปรับแต่งใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - ถอดคลาส `font-mono` และ `font-sans` ออกจากการ์ดสรุปสถิติ, ตัวเลือก Month Picker, และตารางพรีวิวรายชื่อผู้ใช้ เพื่อให้แสดงผลด้วยฟอนต์ Prompt ที่กลมกลืนกับแถบเมนูนำทางทั้งหมด
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic Changes)**:
    - ไม่มีการแก้ไข Logic การทำงาน, ฐานข้อมูล, API หรือ Security ใด ๆ ทั้งสิ้น
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ทั้ง 12/12 static pages
    - ตรวจสอบผ่าน Browser Subagent (1440x900) ยืนยันว่าหน้าเว็บแอปทั้งหมดใช้ฟอนต์ Prompt ที่สวยงาม คมชัด เข้าคู่กับแถบเมนูนำทางอย่างสมบูรณ์แบบ 100%

- **ปรับแต่งแบบอักษร (Typography) ของหน้าจัดการผู้ใช้งานระบบ (User Management) ให้สอดคล้องกับแถบเมนูนำทาง (เสร็จสมบูรณ์ 100%)**:
  - **การปรับแต่งใน [frontend/app/users/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/users/page.tsx)**:
    - ปรับแก้หัวข้อหลัก (`h1` "จัดการผู้ใช้งานระบบ (User Management)") จากเดิมที่มี `font-display font-bold tracking-tight` ให้เป็น `font-semibold text-slate-900` โดยตัดคลาส `tracking-tight` ออก เพื่อให้สระและวรรณยุกต์ภาษาไทยโปร่งตา อ่านง่าย ไม่เบียดชิดกัน และเข้าคู่กับแถบเมนูนำทาง (Sidebar Navigation)
    - ปรับระดับน้ำหนักตัวอักษรของปุ่มสร้างผู้ใช้ (`UserPlus`), ป้ายสิทธิ์บทบาท (`getRoleBadge`), หัวตาราง (`thead`), รายชื่อผู้ใช้ (`u.fullName`), และปุ่มการจัดการในตาราง (`Role`) จาก `font-bold` เป็น `font-medium`
    - ปรับแต่ง Modals ทั้ง 4 ชุด (สร้างผู้ใช้งานใหม่, แก้ไขข้อมูล, เปลี่ยน Role, รีเซ็ตรหัสผ่าน) ให้ใช้หัวข้อ `font-semibold text-slate-900` และ Label/Input เป็น `font-medium` / `font-normal`
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic Changes)**:
    - ไม่มีการแก้ไข Logic การสร้าง, แก้ไข, เปลี่ยน Role, ลบ, หรือรีเซ็ตรหัสผ่านผู้ใช้งาน
    - ไม่มีการแก้ไข Backend API, Database, Permission หรือ Role ใด ๆ
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ทั้ง 12/12 static pages
    - ตรวจสอบผ่าน Browser Subagent (1440x900) ทั้งหน้าหลักและ Modal สวยงาม คมชัด และฟอนต์เข้ากันได้อย่างลงตัว 100%

- **ปรับปรุงตัวเลือกใน Modern Capsule Dropdown เป็น 3 รูปแบบตามความต้องการ (เสร็จสมบูรณ์ 100%)**:
  - **การปรับแต่งใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - ปรับรายการตัวเลือกช่วงเวลาในเมนูดรอปดาวน์ให้มี 3 ตัวเลือกหลักตามคำขอ:
      1. **เดือนนี้** (`this_month`): ตัวเลือกค่าเริ่มต้น แสดงสถิติของเดือนปัจจุบัน
      2. **กำหนดเอง** (`custom_month`): มีช่องระบุเดือนแบบ Month Picker (`input type="month"`) ให้ผู้ใช้เลือกเดือนที่ต้องการ และแปลงชื่อเดือนภาษาไทย (`formatThaiMonth` เช่น *ก.ย. 2569*) บนป้ายปุ่ม Trigger อัตโนมัติ
      3. **ทั้งหมด** (`all`): แสดงข้อมูลรวมทั้งหมด
    - คงความสามารถในการเปิด/ปิดเมนู Popover อย่างนุ่มนวล พร้อมการแสดงสถานะที่เลือกและระบบ Click Outside
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic Changes)**:
    - ไม่มีการแก้ไขหน้า Dashboard ของ Supervisor หรือ Staff
    - ไม่มีการแก้ไข Backend API, Database, Permission หรือ Role ใด ๆ
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ทั้ง 12/12 static pages
    - ตรวจสอบผ่าน Browser Subagent (1440x900) ยืนยันการแสดงผล 3 ตัวเลือกพร้อม Month Picker ครบถ้วน 100%

- **ปรับปรุงดีไซน์ปุ่มตัวกรอง "เดือนนี้" เป็น Modern Capsule Dropdown พร้อมเมนูเลือกช่วงเวลาจริง (เสร็จสมบูรณ์ 100%)**:
  - **การปรับแต่งใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - ออกแบบปุ่มตัวกรองใหม่สไตล์ **Modern Capsule (Soft Slate & Clean White)** รูปทรงแคปซูลมนละมุน (`rounded-full`) พื้นหลังสีขาวสะอาดตาพร้อมขอบบางเบา
    - เพิ่ม Badge วงกลมไอคอนปฏิทินโทนสีคราม (`bg-indigo-50 text-indigo-600`) และไอคอน `ChevronDown` พร้อมอนิเมชันหมุนกลับ 180° เมื่อเปิดเมนู
    - เพิ่มเมนูดรอปดาวน์แบบ Popover (`rounded-2xl shadow-lg border border-slate-200/90`) ให้ผู้ใช้กดเลือกช่วงเวลาได้จริง 4 ตัวเลือก: `เดือนนี้`, `เดือนที่แล้ว`, `ไตรมาสนี้`, `ทั้งหมด`
    - แสดงสถานะตัวเลือกปัจจุบันด้วยพื้นหลังไฮไลต์สีครามอ่อนและไอคอนเครื่องหมายถูก `Check`
    - รองรับระบบ Click Outside Listener ปิดเมนูอัตโนมัติเมื่อผู้ใช้คลิกภายนอก
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic Changes)**:
    - ไม่มีการแก้ไขหน้า Dashboard ของ Supervisor หรือ Staff
    - ไม่มีการแก้ไข Backend API, Database, Permission หรือ Role ใด ๆ
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ทั้ง 12/12 static pages
    - ตรวจสอบผ่าน Browser Subagent ทั้งสถานะปิด (Closed Capsule) และสถานะเปิด (Interactive Popover) สวยงาม คมชัด และทำงานได้อย่างราบรื่น 100%

- **ปรับเปลี่ยนดีไซน์กราฟในหน้า Admin Dashboard เป็นแบบที่ 3: Role + Growth (Bar Chart) ตามรูปต้นแบบ (เสร็จสมบูรณ์ 100%)**:
  - **การปรับแต่งใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - **Header**: ปรับไอคอนเป็น `Users` ในพื้นหลังสีชมพูอ่อน (`bg-rose-50 text-rose-500`), หัวข้อ "ผู้ใช้งานตามบทบาท", คำบรรยาย "จำนวนผู้ใช้งานในแต่ละบทบาท และการเติบโตจากเดือนก่อน", และปุ่มตัวกรอง "เดือนนี้" พร้อมไอคอนปฏิทิน (`Calendar`) และ `ChevronDown`
    - **Grouped Bar Chart (ฝั่งซ้าย)**: กราฟแท่งเปรียบเทียบสถิติระหว่าง "เดือนก่อน" (`#C7D2FE` สีม่วงครามพาสเทล) กับ "เดือนนี้" (`#4F46E5` สีคราม Indigo เข้ม) โดยแบ่งตาม 3 บทบาท (`Admin`: 1 vs 1, `Supervisor`: 2 vs 2, `Staff`: 6 vs 8) พร้อมตัวเลขกำกับบนยอดแท่งกราฟและเส้นกริดแกน Y (0 ถึง 10)
    - **Role Growth Cards (ฝั่งขวา)**: การ์ดสรุป 3 บทบาท พร้อมไอคอนประจำกลุ่มและตัวชี้วัดการเติบโต (`Admin`: 1 บัญชี 0%, `Supervisor`: 2 บัญชี 0%, `Staff`: ไฮไลต์สีครามอ่อน 8 บัญชี +33% พร้อมข้อความ *"เพิ่มขึ้น 2 บัญชีจากเดือนก่อน"*)
    - จัดวางเลย์เอาต์หน้าจอแบบ Grid 2 คอลัมน์ภายในกล่องอย่างสมดุล สวยงาม และ Responsive ทุกขนาดหน้าจอ
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic Changes)**:
    - ไม่มีการแก้ไขหน้า Dashboard ของ Supervisor หรือ Staff
    - ไม่มีการแก้ไข Backend API, Database, Permission หรือ Role ใด ๆ
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ทั้ง 12/12 static pages
    - บันทึกภาพยืนยันการแสดงผลผ่าน Browser Subagent (1440x900) ตรงตามดีไซน์แบบที่ 3 ครบถ้วน 100%

- **ปรับเปลี่ยนรูปแบบกราฟในหน้า Admin Dashboard เป็น Smooth Curved Line Chart (กราฟเส้นจำแนกตามบทบาท) ตามคำขอ (เสร็จสมบูรณ์ 100%)**:
  - **การดำเนินการใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - ออกแบบกราฟเส้นแบบเส้นโค้งนุ่มนวล (Smooth Curved Line Chart / Bezier Spline) จำแนกตามบทบาททั้ง 3 กลุ่ม (`ผู้ดูแลระบบ (Admin)`, `หัวหน้างาน (Supervisor)`, `พนักงานทั่วไป (Staff)`)
    - เพิ่มเลเยอร์ Gradient โปร่งแสงไล่ระดับสีใต้เส้นกราฟ (`staffGrad` โทนคราม Indigo, `superGrad` โทนอำพัน Amber, `adminGrad` โทนแดง Crimson)
    - จัดวาง Legend Badge ด้านบนการ์ดอย่างกะทัดรัดและอ่านง่าย พร้อมแสดงสัดส่วนผู้ใช้งานทั้งจำนวนและเปอร์เซ็นต์ (`8 คน (73%)`, `2 คน (18%)`, `1 คน (9%)`, รวม `11 บัญชี`)
    - ปรับแต่ง Badge ปลายเส้นกราฟ (`8 คน`, `2 คน`, `1 คน`) ให้มีระยะห่างในแนวแกน Y อย่างเหมาะสม ไม่ซ้อนทับกับป้ายกำกับแกน X (`ปัจจุบัน`)
    - คงการจัดกึ่งกลางตัวเลข 3 Summary KPI Cards และฟอนต์ `Prompt` (`font-body`) สอดคล้องกับแถบเมนู
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic Changes)**:
    - ไม่มีการแก้ไขหน้า Dashboard ของ Supervisor หรือ Staff
    - ไม่มีการแก้ไข Backend API, Database, Permission หรือ Role ใด ๆ
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ทั้ง 12/12 static pages
    - บันทึกภาพยืนยันการแสดงผลผ่าน Browser Subagent (1440x900) สวยงาม คมชัด และอ่านค่าง่าย 100%

- **ยกเลิกการปรับเปลี่ยนกราฟและคืนค่ากลับสู่ Donut Chart หน้า Admin Dashboard ตามคำขอ (เสร็จสมบูรณ์ 100%)**:
  - **การดำเนินการใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - ยกเลิกการแก้ไข Stacked Progress Bar และนำ Donut SVG Chart พร้อม Legend รายการบทบาทเดิมกลับมาใช้งานอย่างสมบูรณ์
    - คงการจัดตำแหน่งตัวเลขสถิติกึ่งกลาง (Centered) บน 3 Summary KPI Cards
    - คงการใช้ฟอนต์ `Prompt` (`font-body`) และการตัด `tracking-tight` ออกเพื่อให้ตัวหนังสือสอดคล้องกับแถบเมนูนำทาง
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic Changes)**:
    - ไม่มีการแก้ไขหน้า Dashboard ของ Supervisor หรือ Staff
    - ไม่มีการแก้ไข Backend API, Database, Permission หรือ Role ใด ๆ
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ทั้ง 12/12 static pages
    - ตรวจสอบผ่าน Browser Subagent บน Desktop 1440x900 บันทึกภาพยืนยันการคืนค่ากลับสู่สถานะเดิมเรียบร้อย 100%

## 14 ก.ย. 2026
- **ปรับตำแหน่งตัวเลขสถิติบน Summary Cards หน้า Admin Dashboard ให้อยู่กึ่งกลาง (Centered) (เสร็จสมบูรณ์ 100%)**:
  - **การปรับแต่งใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - ปรับแถบแสดงตัวเลขสถิติใน 3 Summary KPI Cards (`ผู้ใช้งานทั้งหมด`, `บัญชีที่ใช้งานได้`, `บัญชีที่ถูกระงับ`) ให้จัดวางอยู่ **กึ่งกลาง (Centered)** ของการ์ดอย่างสมดุล ด้วยคลาส `my-auto py-3 flex items-baseline justify-center gap-2`
    - คงขนาดและสไตล์ตัวอักษร `font-semibold` และ `font-body` (Prompt Sans) ที่สอดคล้องกับแถบเมนูนำทางอย่างสวยงาม
    - คงการจัดวางส่วนบน (หัวข้อและไอคอน) และส่วนล่าง (คำอธิบายและเปอร์เซ็นต์) ไว้อย่างเป็นระเบียบ
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic & Role Changes)**:
    - ไม่มีการแก้ไขหน้า Dashboard ของ Supervisor หรือ Staff
    - ไม่มีการแก้ไข Backend API, Database, Permission หรือ Role ใด ๆ
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ทั้ง 12/12 static pages
    - ตรวจสอบการแสดงผลจริงผ่าน Browser Subagent (1440x900) บันทึกภาพยืนยันตัวเลขอยู่กึ่งกลางการ์ดอย่างสมบูรณ์

- **ปรับแต่งแบบอักษร (Typography) ของหน้า Admin Dashboard ให้สอดคล้องเป็นหนึ่งเดียวกับแถบเมนูนำทาง (Navigation Sidebar) (เสร็จสมบูรณ์ 100%)**:
  - **การปรับแต่งใน [frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx)**:
    - กำหนดให้ใช้ฟอนต์ `font-body` (Prompt Sans) และระดับน้ำหนักตัวอักษรแบบมาตรฐาน (`font-normal`, `font-medium`, `font-semibold`) ทั่วทั้งหน้า Admin Dashboard
    - ปรับแก้หัวข้อหลัก (`h1` "แผงควบคุมระบบ") จากเดิมที่เป็น `font-display font-bold tracking-tight` มาเป็น `font-semibold text-slate-900` โดยตัดคลาส `tracking-tight` ออก เพื่อให้สระและวรรณยุกต์ภาษาไทยไม่บีบชิดกัน สวยงามโปร่งตาเหมือนแถบเมนู
    - ปรับน้ำหนักตัวอักษรของคำบรรยาย (Subtitles), วันที่, และปุ่ม Quick Action ให้มีขนาดและน้ำหนักกลมกลืนกับรายการในเมนูนำทาง
    - ปรับ 3 Summary KPI Cards: ป้ายหมวดหมู่ใช้ `font-medium tracking-wider`, ชื่อการ์ดใช้ `font-medium`, ตัวเลขสถิติใช้ `font-semibold` ไม่หนาเกินไปจนดูเทอะทะ, และคำอธิบายย่อยใช้ `font-normal`
    - ปรับหัวข้อของส่วน "ผู้ใช้งานตามบทบาท", "สถานะระบบ (System Status)", และตาราง "สถานะผู้ใช้งานล่าสุด (Recent Users)" รวมถึงสถานะ "พร้อมใช้งาน" ให้ใช้น้ำหนักและฟอนต์มาตรฐานเช่นเดียวกับ Status Badge ในแถบเมนูด้านบน
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic & Role Changes)**:
    - ไม่มีการแก้ไขหน้า Dashboard ของ Supervisor หรือ Staff
    - ไม่มีการแก้ไข Backend API, Database, Permission หรือ Role ใด ๆ
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การตรวจสอบและการทดสอบ (Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Vitest Unit Tests: 81/81 ผ่านทั้งหมด (100% PASS)
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ทั้ง 12/12 static pages
    - ตรวจสอบความสวยงามด้วย Browser Subagent บนความละเอียด Desktop (1440x900) ยืนยันรูปแบบตัวอักษรเข้ากันได้อย่างลงตัวกับ Sidebar Menu

- **ปรับปรุง UI/UX หน้า Admin Dashboard ให้สะอาด อ่านง่าย และมีความคมชัดสูง (STEP 4.52 — Admin Dashboard UI Redesign) (เสร็จสมบูรณ์ 100%)**:
  - **ปรับปรุงการจัดวางและการอ่านข้อมูลบน Admin Dashboard ([frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx))**:
    - **Summary Cards (4 การ์ด)**: ปรับตำแหน่งตัวเลขให้อยู่ **กึ่งกลาง (Centered)** ของการ์ดอย่างสมดุล ตัวเลขขนาดใหญ่เด่นชัด (`text-4xl sm:text-5xl font-black`) พร้อม Badge ป้ายกำกับหน่วยนับเคียงข้างตัวเลขตรงกลาง โดยคงแถบหัวข้อและไอคอนไว้ด้านบน และคำอธิบายสถานะอยู่ด้านล่างอย่างเป็นระเบียบ
    - **สัดส่วนผู้ใช้งานตามบทบาท (Users by Role - ข้อ 2)**: ปรับปรุง Donut SVG Chart และรายการแจกแจงบทบาท ป้องกันข้อความยาวไม่ให้ตกบรรทัด มีแถบ Progress Bar แสดงสัดส่วนเปอร์เซ็นต์ของแต่ละ Role ชัดเจน สะอาดตา
    - **สถานะระบบ (System Status - ข้อ 2)**: ปรับรูปแบบเป็นแถวแนวตั้งแบบโปร่งสบายตา 4 ระบบหลัก (เว็บแอปพลิเคชัน Frontend, เกตเวย์ API Backend, ฐานข้อมูล PostgreSQL, การควบคุมสิทธิ์ RBAC) พร้อม Status Pill สีเขียว Emerald แสดงสถานะ `Online` / `Connected` / `Enforced` อย่างคมชัด ไม่ตกบรรทัด
    - **ตารางสรุปผู้ใช้งานล่าสุด (Recent Users)**: ปรับแต่งตารางให้มีขอบโค้งมน แถบหัวข้ออ่านง่าย และมีปุ่ม Quick Action ที่กดง่าย
  - **การรักษาความถูกต้องของระบบ (Strict Isolation & Zero Business Logic Changes)**:
    - ไม่มีการแก้ไขหน้า Dashboard ของ `supervisor` และ `warehouse_staff`
    - ไม่มีการแก้ไข Backend API, Database Schema, Permission หรือ Business Logic ใด ๆ
    - ปราศจากการใช้ `any` ใน TypeScript (100% Type-Safe)
  - **การทดสอบและการตรวจสอบ (Automated Verification)**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Frontend Unit Tests (`vitest`): 81/81 ผ่านทั้งหมด (รวม `dashboard.test.tsx` 4/4 ผ่าน)
    - Production Build (`npm run build`): สำเร็จ 12/12 routes

## 11 ก.ย. 2026
- **ปรับปรุง Admin Dashboard ให้เน้นการจัดการระบบและผู้ใช้งาน (STEP 4.51 — Admin Dashboard Redesign) (เสร็จสมบูรณ์ 100%)**:
  - **ปรับปรุงหน้า Dashboard เฉพาะสิทธิ์ Admin ([frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx))**:
    - แยกการแสดงผลของ Role `admin` ออกจาก Supervisor และ Staff อย่างเด็ดขาด (`if (isAdmin)`)
    - **Header Section**: แสดงหัวข้อ *"Admin Dashboard"*, Subtitle *"ภาพรวมการจัดการระบบและบัญชีผู้ใช้งาน WPK MMS"*, วันที่ปัจจุบันภาษาไทย, และปุ่ม Quick Action `[ จัดการผู้ใช้งาน ]` ลิงก์ตรงสู่ `/users`
    - **Top 3 Summary Cards**:
      1. *ผู้ใช้งานทั้งหมด (Total Accounts)*: ดึงตัวเลขจริงจาก API `/users` (10 บัญชี, 100%)
      2. *บัญชีที่ใช้งานได้ (Active Status)*: นับจำนวนผู้ใช้ที่พร้อมใช้งาน (10 บัญชี, 100%) โทนสี Emerald
      3. *บัญชีที่ถูกระงับ (Restricted)*: นับจำนวนผู้ใช้ที่สถานะ disabled หรือ rejected (0 บัญชี, 0%) โทนสี Slate
    - **Middle Section (2 คอลัมน์ Responsive)**:
      1. *สัดส่วนผู้ใช้งานตามบทบาท (Users by Role)*: จำแนกสัดส่วน Admin, Supervisor, Warehouse Staff พร้อม Progress Bars และสถิติชัดเจน
      2. *สถานะระบบ (System Status)*: แสดงสถานะ Web Application (Online), API Gateway (Connected), Database Service (Connected), และ Role-Based Access Control (Enforced)
    - **Lower Section**: ตารางสรุปสถานะผู้ใช้งานล่าสุด (*Recent Users*) 6 รายการ พร้อม Badge บทบาท, สถานะ และวันที่ลงทะเบียน พร้อมปุ่มลิงก์สู่หน้าจัดการผู้ใช้ทั้งหมด
    - **ขอบเขตการทำงานที่ปลอดภัย (Strict Isolation)**:
      - ตัดข้อมูลที่ไม่ใช่งานของ Admin ออกทั้งหมด เช่น จำนวนคงเหลือสต็อก, รายการสแกน FIFO, การอนุมัติ/ปฏิเสธธุรกรรม, กราฟรับเข้า-เบิกออกคลัง
      - หน้า Dashboard ของ `supervisor` และ `warehouse_staff` ไม่ได้รับการแก้ไขหรือกระทบใด ๆ ทั้งสิ้น 100%
      - ไม่มีการแก้ไข Backend API, Database Schema, Permission หรือ Business Logic
  - **เพิ่ม Automated Unit Tests ([frontend/__tests__/unit/dashboard.test.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/unit/dashboard.test.tsx))**:
    - เพิ่ม Mock `getUsers` และ Test Case ตรวจสอบการเรนเดอร์ Admin Dashboard ครบถ้วนทุกส่วน (Header, Summary Cards, Role breakdown, System Status, Recent Users)
    - ตรวจสอบ Assertion ยืนยันว่าไม่มีการแสดงผลกิจกรรมธุรกรรมคลังสินค้าบนหน้า Admin Dashboard
    - ผลการรัน Unit Tests: Frontend 81/81 ผ่าน, Backend 79/79 ผ่าน (รวม 160/160 ผ่าน 100%)
  - **เพิ่มเมนูนำทางและปุ่มเข้าสู่ Admin Dashboard ([frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx) และ [frontend/app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/page.tsx))**:
    - เพิ่มเมนู `{ href: '/dashboard', icon: LayoutDashboard, label: 'แดชบอร์ด' }` ไว้ลำดับสุดท้ายใน `getNavItems()` สำหรับ Role `admin` ทำให้ปรากฏเมนู "แดชบอร์ด" อยู่ลำดับสุดท้ายใน Sidebar (Desktop) และอยู่ขวาสุดในแถบเมนูด้านล่าง (Mobile Bottom Nav) อย่างถูกต้องสอดคล้องกับ Role อื่น ๆ
    - ปรับลำดับการ์ดบนหน้าหลัก (`/`) ของ Admin ให้แสดง "จัดการผู้ใช้งาน" (`/users`) เป็นการ์ดแรก และ "แดชบอร์ดระบบ" (`/dashboard`) เป็นการ์ดถัดไป (ลำดับสุดท้าย)
  - **การตรวจสอบความเข้ากันได้และการแสดงผล**:
    - TypeScript Type Check (`tsc --noEmit` ทั้ง Frontend และ Backend): 0 errors
    - Next.js Production Build (`npm run build`): สำเร็จ 12/12 routes
    - Browser UI Smoke Test (Desktop 1280x800 & Mobile 375x812): ผ่านสมบูรณ์แบบ สามารถคลิกเข้า Dashboard ผ่าน Sidebar, Quick Action บนหน้าหลัก และ Mobile Nav ได้อย่างลื่นไหล ไม่พบ Layout Shift หรือ Horizontal Overflow

## 10 ก.ย. 2026
- **ปรับปรุง UI/UX Card "สต็อกขั้นต่ำ" ในหน้าสต็อกสินค้า (Inventory Page) (เสร็จสมบูรณ์ 100%)**:
  - **ปรับข้อความหลักและรูปแบบการแสดงผล ([frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx))**:
    - เปลี่ยน Label จาก `"จุดสั่งซื้อ (MIN)"` เป็น `"สต็อกขั้นต่ำ"` เพื่อสื่อความหมายอย่างตรงไปตรงมา ป้องกันความเข้าใจผิดว่าเป็นการสั่งซื้อหรือพื้นที่จัดเก็บ
    - กรณีที่กำหนดค่า Minimum Stock (เช่น `5 Cap200L`): แสดงตัวเลข `5` เด่นชัด พร้อมหน่วยนับ และคำอธิบายย่อย `"เกณฑ์สำหรับแจ้งเตือนสต็อกใกล้หมด"`
    - กรณีที่ยังไม่ได้กำหนดค่า (`minStock === null || minStock === undefined`): แสดงตัวเลข `—` และสถานะ `"ยังไม่ได้กำหนด"` แทน `"-"` และ `"ไม่ระบุ"` ในโทนสีนุ่มนวล ไม่ดูเหมือนข้อผิดพลาดของระบบ
    - กรณีสินค้าเข้าสู่สภาวะสต็อกต่ำ (`quantity <= minStock && status === 'active'`): แสดงแถบกำกับ `"สต็อกขั้นต่ำ"` ควบคู่กับ Badge สีแดง `"• ใกล้หมด"` แบบกระพริบอย่างชัดเจน
    - รักษาการแบ่งแยกความหมายจาก `"📍 คลังจัดเก็บ: WPK (-)"` ไว้อย่างชัดเจน ไม่สับสนปนเปกัน
  - **การรักษาความถูกต้องของระบบ (Zero Business Logic Changes)**:
    - ดึงข้อมูลจาก Data Field เดิม (`item.minStock`, `item.quantity`, `item.unit`, `item.status`) ไม่มีการแก้ไข Database Schema, API หรือ Logic
    - ไม่มีผลกระทบต่อ Stock Calculation, FIFO Engine, Low Stock Notification, Transaction หรือ Role & Permission ใด ๆ
  - **Automated Verification & Browser UI**:
    - TypeScript Type Check (`tsc --noEmit`): 0 errors
    - Frontend Unit Tests (`npm test`): 80/80 passed (100%)
    - Browser Verification: ตรวจสอบทั้ง Desktop (1280x800) และ Mobile/Responsive พบการจัดวาง Layout สวยงาม สอดคล้องกับ Card อื่น ๆ ในหน้าจอ

- **จัดทำและตรวจสอบเอกสารสรุปสถานะระบบขั้นสุดท้าย (STEP 4.34 — Final Documentation & System Baseline) (เสร็จสมบูรณ์ 100%)**:
  - **จัดทำเอกสาร Master Baseline ([SYSTEM_BASELINE.md](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/SYSTEM_BASELINE.md))**:
    - สรุปสถานะและสถาปัตยกรรมระบบขั้นสุดท้ายครอบคลุม 20 หมวดหมู่ตามข้อกำหนดจริงของระบบ หลังผ่านการ Hardening ใน STEP 4.32 และ Full System Regression ใน STEP 4.33
    - **บทบาทและขอบเขตสิทธิ์ (Role & Permission Boundary)**:
      - `admin`: จัดการบัญชีผู้ใช้ (สร้าง, ปรับสถานะ, รีเซ็ตรหัสผ่าน) ไม่มีสิทธิ์อนุมัติ/ปฏิเสธธุรกรรมคลัง
      - `supervisor`: ตรวจสอบและอนุมัติ/ปฏิเสธธุรกรรมรับ-จ่าย, ดูสต็อก/Lot FIFO, สิทธิ์เข้าถึงภาพรวมคลังสินค้าทั้งหมด (Warehouse-wide scope), ดูรายงานและส่งออกไฟล์ Excel
      - `warehouse_staff`: สแกน QR รับเข้า/เบิกออก, แดชบอร์ดแบบ Hybrid แบ่งเป็นสถิติการทำงานของตนเอง (Personal Activity) และภาพรวมคลังสินค้า (Warehouse Overview) ที่จำเป็นต่อการปฏิบัติงาน โดยข้อมูลธุรกรรมถูกจำกัดสิทธิ์ (Data Isolation) ไม่สามารถเห็นธุรกรรมของพนักงานคนอื่น
    - **การจัดการสต็อกและกระบวนการ FIFO**:
      - บันทึกการรับเข้า (`receive`) สร้าง Lot ใหม่พร้อมระบุ `receivedDate`
      - การเบิกจ่าย (`issue`) ตัดสต็อกตามลำดับ FIFO (`ProductLot` ที่เก่าที่สุดก่อน) พร้อมบันทึกรายละเอียดการกระจายลงใน `TransactionLot`
      - มีระบบ Inline Validation และ Submit Guard ป้องกันการกรอกจำนวนเบิกเกินสต็อกคงเหลือตั้งแต่หน้าสแกน
      - ระบบ Low Stock Notification แจ้งเตือน Supervisor อัตโนมัติเมื่อ Packaging คงเหลือ `<= minStock` พร้อมกลไกป้องกันการแจ้งเตือนซ้ำซ้อน
    - **Security & Authentication Summary**:
      - บันทึกการถอด Hardcoded / Fast-path Fallback Login และ `fallbackUsersCache` ออกอย่างสมบูรณ์
      - บันทึกการบังคับใช้ Strict CORS Whitelist แบบ Exact Match ตัดช่องโหว่ Substring Matching
      - ห้ามใส่ Secret, Credential, Database URL หรือรหัสผ่านจริงลงในเอกสาร
    - **Requirement & Feature Status Matrix (19 รายการ)**:
      - สรุปสถานะ PASS ครบทุก Core Features, ระบุ GAP-001 เป็น `PENDING` (รอไฟล์ PDF Work Instruction จากผู้ใช้), GAP-003 เป็น `TECHNICAL DEBT` (ปิดรับสมัครสาธารณะแล้วโดยตั้งใจ), และบันทึก Batch Scanning / Cycle Count / PDF Export เป็น `FUTURE ENHANCEMENT`
    - **Known Findings / Technical Debt**:
      - ระบุ GAP-001 (รอไฟล์ PDF จริง), React 19 ESLint setState-in-effect ใน `users/page.tsx` และ `Navigation.tsx` (INFO / Technical Debt ที่ไม่กระทบ Production Build), และ Legacy Pending User Endpoints (Technical Debt)
    - **Production Deployment Notes & Git Baseline**:
      - สรุปรายการ Environment Variables ที่จำเป็นต้องตั้งค่าก่อนขึ้น Production
      - บันทึก Git Baseline: Branch `main`, Commit `417d271b104db09b0c2ba63e501d17ebd622914b`, Synchronized with `origin/main`
  - **ปรับปรุงเอกสารภาพรวมโครงการ ([README.md](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/README.md))**:
    - แก้ไขชื่อโฟลเดอร์จาก `QRcodeWebapp/` เป็น `frontend/` ให้ตรงกับโครงสร้างจริงของ Repository
    - เพิ่มลิงก์อ้างอิงไปยัง [SYSTEM_BASELINE.md](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/SYSTEM_BASELINE.md)
  - **การปฏิบัติตามขอบเขตงานอย่างเคร่งครัด (Strict Boundary & Safety)**:
    - ไม่มีการแก้ไข Source Code, Database Schema, API Logic, Authentication Logic หรือ UI ใด ๆ ทั้งสิ้น (`SOURCE CODE CHANGED: NO`, `DATABASE CHANGED: NO`, `UI CHANGED: NO`)
    - ยึดตามกฎ NO COMMIT / NO PUSH ใน STEP 4.34 เพื่อรอการตรวจสอบจากผู้ใช้ก่อนดำเนินการในขั้นตอนถัดไป

- **Security Hardening: ถอด Login Fallback & บังคับใช้ Strict CORS (STEP 4.32) (เสร็จสมบูรณ์ 100%)**:
  - **ถอด Hardcoded Fast-path Fallback Login ([backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts))**:
    - ลบเงื่อนไขตรวจสอบรหัสผ่านแบบ hardcode สำหรับบัญชีเริ่มต้น (`admin / admin123`, `supervisor / super1234`, `staff / staff123`) ใน `POST /auth/login`
    - ลบ Mock User Objects (ID 6, 10, 7) ที่เคยถูกนำมาออก JWT Token อัตโนมัติเมื่อฐานข้อมูลเกิดข้อผิดพลาด
    - ปรับกระบวนการ Login ให้ค้นหาผู้ใช้งานจากฐานข้อมูลจริง (`prisma.user.findFirst`) และตรวจสอบ Hash รหัสผ่านด้วย `bcrypt.compare` เท่านั้น
    - หากเกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล ระบบจะส่งคืน HTTP 500 อย่างถูกต้องโดยไม่ออก Token หรือจำลองตัวตนใด ๆ
  - **ถอด In-Memory `fallbackUsersCache` ([backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts))**:
    - ลบการประกาศ `fallbackUsersCache` ที่เคยใช้เก็บข้อมูลผู้ใช้งานและ Plaintext Password ในหน่วยความจำ
    - ถอดการตรวจสอบ `fallbackUsersCache` ใน `POST /auth/login` และ `POST /users`
    - หาก Admin สร้างผู้ใช้แล้ว Database เกิดข้อผิดพลาด ระบบจะส่งคืน HTTP 500 เพื่อความปลอดภัย ไม่สร้างบัญชีแบบ Memory Mode
  - **บังคับใช้ Strict Origin Matching สำหรับ CORS ([backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts))**:
    - ยกเลิกการตรวจสอบแบบ Substring `cleanOrigin?.includes('vercel.app')` และ `cleanOrigin?.includes('localhost')` ที่เปิดช่องโหว่ให้โดเมนแปลกปลอมเข้าถึง API
    - เปลี่ยนเป็นการตรวจสอบ Exact Match กับ Whitelist ที่ระบุใน `process.env.CORS_ORIGIN` (รองรับ Comma-separated domains พร้อมตัด trailing slash)
    - หาก Origin ไม่ตรงกับ Whitelist จะไม่ส่ง Header `Access-Control-Allow-Origin` กลับไป
  - **Automated Tests & Regression Verification ([backend/__tests__/api.test.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/__tests__/api.test.ts))**:
    - เพิ่มชุดทดสอบ Security Hardening 7 รายการ: การปฏิเสธรหัสผ่านผิด (401), ผู้ใช้ที่ไม่มีอยู่ (401), การรับมือข้อผิดพลาด DB โดยไม่ออก Token (500), การอนุญาต Exact Allowed Origin, การปฏิเสธ Unauthorized Origin, การปฏิเสธ Fake vercel.app Origin, และการปฏิเสธ Fake localhost Origin
    - ผลการรันชุดทดสอบ Vitest ใน Backend: 79 / 79 tests PASS (100%)
    - ผลการรันชุดทดสอบ Vitest ใน Frontend: 80 / 80 tests PASS (100%)
    - TypeScript Type Check: 0 errors ทั้ง Backend และ Frontend

- **แก้ไขปัญหา TypeScript Error ใน low-stock.test.ts และจัดการ CSS Warning ใน globals.css**:
  - **แก้ไข TypeScript Type Mismatch ใน [`backend/__tests__/low-stock.test.ts`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/__tests__/low-stock.test.ts)**:
    - แก้ไขข้อผิดพลาด `TS2322` ที่บรรทัด 572 ใน Test 20 (`Notification Creation Failure: stock update should still succeed even if notification fails`)
    - ทำการระบุ Type ด้วย `as unknown as typeof prisma.notification.create` เพื่อให้ตรงกับ Method Signature ของ Prisma Client โดยไม่ละเมิดกฎการห้ามใช้ `any`
    - ตรวจสอบผ่านคำสั่ง `npx tsc --noEmit --skipLibCheck --esModuleInterop __tests__/low-stock.test.ts` ผลลัพธ์ 0 errors ผ่าน 100%
  - **จัดการ CSS Warning ใน Editor ([`.vscode/settings.json`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/.vscode/settings.json))**:
    - เพิ่มการตั้งค่า `"css.lint.unknownAtRules": "ignore"` เพื่อให้ Editor ไม่แจ้งเตือน Warning กับคำสั่ง `@theme` ของ Tailwind CSS v4 ใน [`frontend/app/globals.css`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/globals.css) ทำให้แท็บ Problems สะอาดสมบูรณ์

## 9 ก.ย. 2026
- **ปรับปรุงหน้า Dashboard สำหรับ Staff: Personal Activity + Warehouse Overview (STEP 4.25) (เสร็จสมบูรณ์ 100%)**:
  - **ปรับปรุงการแบ่งกลุ่มและสื่อความหมายบน Dashboard ([frontend/app/dashboard/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/dashboard/page.tsx))**:
    - นำเสนอในรูปแบบ **Hybrid Concept** เพื่อให้ Staff เห็นทั้งสถิติการทำงานของตนเองและภาพรวมคลังสินค้าที่จำเป็นต่อการปฏิบัติงาน โดยแบ่งกลุ่มข้อมูลออกเป็น 2 ส่วนอย่างชัดเจน:
      1. **Personal Activity (สถิติการทำงานของฉัน)** สำหรับ Staff:
         - หัวข้อกลุ่ม: `"สถิติการทำงานของฉัน"` พร้อม Badge กำกับ `"สถิติเฉพาะบุคคล (My Activity)"`
         - ปรับข้อความการ์ดสถิติธุรกรรมให้ชัดเจน:
           - `"คุณรับเข้าวันนี้"` (แทน "รับเข้าวันนี้")
           - `"คุณเบิกออกวันนี้"` (แทน "เบิกออกวันนี้")
           - `"รายการของคุณที่รอยืนยัน"` (แทน "รายการรอยืนยัน")
         - กราฟแนวโน้ม 7 วัน: `"สรุปการทำงานของคุณ 7 วันล่าสุด"` พร้อมคำอธิบาย `"เปรียบเทียบจำนวนรายการที่คุณรับเข้าและเบิกออกแยกตามวัน"`
         - ตารางรายการธุรกรรมล่าสุด: `"รายการของคุณล่าสุด"` พร้อมคำอธิบาย `"5 รายการประวัติการทำรายการล่าสุดของคุณ"`
         - เมนูด่วน: ปรับปุ่มลัดให้เชื่อมโยงไปยัง `"ดูรายการของฉัน"` (`/transactions`)
      2. **Warehouse Overview (ภาพรวมคลังสินค้า)**:
         - หัวข้อกลุ่ม: `"ภาพรวมคลังสินค้า (Warehouse Overview)"` พร้อม Badge กำกับ `"ข้อมูลรวมทั้งคลัง (Warehouse Aggregate)"`
         - แสดงสถิติรวมของคลังในระดับจำเป็น:
           - การ์ด `"Packaging ทั้งหมด"` (จำนวนรายการสินค้าวัตถุดิบบรรจุภัณฑ์ในคลัง)
           - การ์ด `"จำนวนคงเหลือรวม"` (ผลรวมจำนวนชิ้นคงเหลือของบรรจุภัณฑ์ทั้งหมดในคลัง)
           - การ์ด `"สต็อกใกล้หมด"` (นับจำนวนรายการ Packaging ที่ `quantity <= minStock` เพื่อแจ้งเตือนการเติมสต็อก)
         - กราฟวงกลม Donut `"สัดส่วนวัตถุดิบบรรจุภัณฑ์"` แสดงสัดส่วนประเภทบรรจุภัณฑ์ทั้งหมดในคลัง
         - เมนูด่วน: `"รับเข้าสินค้า"`, `"เบิกออกสินค้า"`, `"สต็อก"`
    - **การรักษาพฤติกรรมเดิมของ Supervisor**:
      - เมื่อผู้ใช้ล็อกอินด้วยสิทธิ์ `supervisor`: ส่วนกิจกรรมธุรกรรมจะแสดงผลเป็น `"กิจกรรมธุรกรรมคลังสินค้า"`, `"รับเข้าวันนี้"`, `"เบิกออกวันนี้"`, `"รายการรอยืนยัน"`, `"สรุปการรับเข้า - เบิกออก 7 วันล่าสุด"`, `"รายการล่าสุด (Recent Transactions)"` และลิงก์ `"ดูรายงานทั้งหมด"` (`/reports`) เหมือนเดิมทุกประการ ไม่มีการเปลี่ยนพฤติกรรม
    - **ความปลอดภัยและการรักษา Data Isolation**:
      - ไม่มีการแก้ไข Backend API (`backend/src/index.ts`), ไม่มีการปลดล็อก `GET /transactions` (Staff ยังคงถูกจำกัดให้ดึงได้เฉพาะรายการที่ตนเองสร้างผ่าน `whereClause.createdById = req.user.id` 100%)
      - Staff ไม่สามารถเข้าถึงรายละเอียด Transaction หรือประวัติการทำงานของ Staff คนอื่น
      - ไม่มีการแก้ไข Database Schema, Prisma, หรือ Migration
  - **Automated Tests & Verification ([frontend/__tests__/unit/dashboard.test.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/unit/dashboard.test.tsx))**:
    - เพิ่มชุดทดสอบ Unit/Component Tests ครอบคลุม 3 สถานการณ์สำคัญ:
      1. Staff Role: ตรวจสอบการแสดงผลกลุ่ม Personal Activity, ข้อความ "คุณรับเข้าวันนี้", "คุณเบิกออกวันนี้", "รายการของคุณที่รอยืนยัน", กราฟการทำงาน 7 วันของฉัน, และรายการล่าสุดของฉัน
      2. Staff Role: ตรวจสอบการแสดงผลกลุ่ม Warehouse Overview, ข้อมูล Aggregate รวมทั้งคลัง (Packaging ทั้งหมด, จำนวนคงเหลือรวม, สต็อกใกล้หมด)
      3. Supervisor Role: ตรวจสอบการคงข้อความระดับคลังสินค้าเดิม (รับเข้าวันนี้, เบิกออกวันนี้, รายการรอยืนยัน, กราฟ 7 วันรวม, รายการล่าสุดรวม) และยืนยันว่าไม่มีคำระบุเฉพาะบุคคล
    - Frontend Unit Tests (`npm test`): 80/80 ผ่านทั้งหมด (8/8 test files)
    - Backend Tests (`npx vitest run`): 72/72 ผ่านทั้งหมด (3/3 test files)
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ 100% (12/12 static pages)
    - ESLint Check: 0 errors

- **เพิ่มระบบตรวจสอบสต็อกคงเหลือแบบทันทีในหน้าสแกน (STEP 4.19 — Inline Stock Validation on Scan Page) (เสร็จสมบูรณ์ 100%)**:
  - **Client-side Inline Stock Validation ([frontend/app/scan/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/scan/page.tsx))**:
    - เพิ่มการคำนวณ `isStockExceeded` แบบไดนามิกเมื่อผู้ใช้เลือกประเภทรายการ "เบิกออก (Issue)" (`scanMode === 'issue'`) และระบุจำนวนเบิกมากกว่าสต็อกคงเหลือของสินค้า (`numQty > currentStock`)
    - แสดงข้อความเตือน Inline Warning ใต้ช่องกรอกจำนวนอย่างชัดเจนและเข้าใจง่าย:
      - หัวข้อเตือน: `⚠️ จำนวนเบิกเกินสต็อกคงเหลือ`
      - ข้อมูลเปรียบเทียบ: สต็อกคงเหลือปัจจุบัน (`{currentStock} {unit}`) และจำนวนที่ต้องการเบิก (`{quantity} {unit}`)
      - คำแนะนำ: `กรุณาระบุจำนวนไม่เกินสต็อกคงเหลือ`
    - ไฮไลต์กรอบช่องกรอกจำนวนด้วยสีแดงอ่อนเมื่อเกิดข้อผิดพลาด เพื่อให้สังเกตเห็นได้ง่าย
    - ปิดการใช้งานปุ่มส่งรายการ (`disabled={loading || isStockExceeded}`) พร้อมสไตล์ `cursor-not-allowed` ทันที ป้องกันการสร้าง Transaction, ไม่เรียก API ไปยัง Backend, และไม่ส่งผลกระทบต่อ FIFO หรือ Lot ใด ๆ
    - เมื่อผู้ใช้แก้ไขจำนวนสินค้าให้กลับมาเท่ากับหรือน้อยกว่าสต็อกคงเหลือ (`Quantity <= Current Stock`) ข้อความเตือนจะหายไปทันทีและปุ่มส่งรายการจะกลับมาใช้งานได้ตามปกติ
    - รายการรับเข้า (Receive / `scanMode === 'receive'`): ไม่ใช้การจำกัดจำนวนสต็อกคงเหลือนี้ เนื่องจากเป็นการเพิ่มยอดสต็อกเข้าคลัง ผู้ใช้งานสามารถระบุจำนวนที่ต้องการรับเข้าได้ตามปกติ
    - กรณีจำนวนว่าง หรือจำนวนเป็น 0: ยังคงใช้ Validation เดิมของระบบ โดยแสดงข้อความ "กรุณาระบุจำนวนสินค้าให้ถูกต้อง (ต้องมากกว่า 0)"
    - เพิ่ม Guard สองชั้นใน `submitTransaction` เพื่อป้องกันกรณี Submit ฟอร์มผ่านคีย์บอร์ด (Enter) ขณะที่จำนวนเบิกเกินสต็อก
  - **Backend Guard & FIFO Integrity**:
    - Backend Stock Guard ใน `POST /transactions/:id/confirm` ยังคงทำงานเป็นด่านรักษาความปลอดภัยหลักตามเดิม
    - ไม่มีการแก้ไข Backend Code, Database Schema, Prisma, หรือ Migration ใด ๆ ทั้งสิ้น
    - ลำดับการตัด Lot แบบ FIFO ยังคงทำงานถูกต้องเหมือนเดิมทุกประการ
  - **Automated Tests & Regression Verification ([frontend/__tests__/unit/scan-stock-validation.test.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/unit/scan-stock-validation.test.tsx))**:
    - เพิ่มชุดทดสอบ Unit/Component Tests ครอบคลุม 7 กรณีสำคัญ:
      1. Issue + Quantity < Stock: ผ่าน ไม่มีข้อความเตือน ปุ่ม Submit ใช้งานได้ และเรียก API สำเร็จ
      2. Issue + Quantity = Stock: ผ่าน ยอมรับการเบิกเต็มจำนวนสต็อก ปุ่ม Submit ใช้งานได้
      3. Issue + Quantity > Stock: แสดง Inline Warning ครบถ้วน, ปุ่ม Submit ถูก Disable, ไม่มีการเรียก API
      4. Receive + Quantity > Stock: ผ่าน ไม่มีข้อความเตือน และส่งคำขอรับเข้าได้ตามปกติ
      5. Quantity = 0: ใช้ Validation เดิมของระบบ แสดงข้อความเตือนและไม่เรียก API
      6. Quantity ว่าง: ใช้ Validation เดิมของระบบ แสดงข้อความเตือนและไม่เรียก API
      7. ปรับจำนวนจากเกินสต็อก (60) กลับมาเป็นค่าที่ถูกต้อง (25): ข้อความเตือนหายไปทันที และปุ่ม Submit กลับมาใช้งานได้
    - Frontend Unit Tests (`npm test`): 77/77 ผ่านทั้งหมด (7/7 test files)
    - Backend Vitest (`npx vitest run`): 72/72 ผ่านทั้งหมด (3/3 test files)
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ 100% (12/12 static pages)
    - ESLint Check (`npx eslint app/scan/page.tsx`): 0 errors
    - Git Diff Check (`git diff --check`): ผ่าน 100%

- **ตรวจสอบความสมบูรณ์ขั้นสุดท้ายและ Date Range Verification ของ Excel Export (STEP 4.17.6 — Final Documentation + Excel Export Date Range Verification) (เสร็จสมบูรณ์ 100%)**:
  - **Date Range & Filter Verification ([frontend/app/reports/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/reports/page.tsx))**:
    - เพิ่มการตรวจสอบความถูกต้องของ Date Range ฝั่ง Client ใน `handleExportExcel` ก่อนส่ง Request:
      1. กรณีเลือก Start Date แต่ไม่เลือก End Date: แจ้งเตือน "กรุณาระบุวันที่สิ้นสุดให้ครบถ้วน"
      2. กรณีเลือก End Date แต่ไม่เลือก Start Date: แจ้งเตือน "กรุณาระบุวันที่เริ่มต้นให้ครบถ้วน"
      3. กรณี Start Date > End Date: แจ้งเตือน "วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด"
      4. กรณีเลือกวันเดียวกัน (Start Date == End Date): ส่งออกข้อมูลของวันนั้นได้อย่างถูกต้องสมบูรณ์
      5. กรณีช่วงวันที่ปกติ (Start Date < End Date): ส่งออกข้อมูลเฉพาะภายในช่วงวันที่ที่เลือก
    - เพิ่ม `aria-label` และ `title` กำกับช่องระบุวันที่เริ่มต้นและวันที่สิ้นสุด ("วันที่เริ่มต้น (Start Date)", "วันที่สิ้นสุด (End Date)") ใน Custom Date Input
    - ตรวจสอบ Date Boundary: ฝั่ง Backend กำหนดเวลาตั้งแต่ 00:00:00.000 ของวันที่เริ่มต้น จนถึง 23:59:59.999 ของวันที่สิ้นสุด ทำให้รายการในวันสุดท้ายของช่วงเวลาไม่ตกหล่น
    - รองรับการทำงานร่วมกันของทุกตัวกรองพร้อมกัน: Date Range + Status + Search (ItemCode) + Category
    - ยืนยันการ Query ข้อมูลจริงจากฐานข้อมูลตาม Filter โดยไม่จำกัดเพียง 200 รายการของหน้าจอ และจำกัด Safety Cap สูงสุด 5,000 รายการ
    - ยืนยันโครงสร้างไฟล์ Excel 16 คอลัมน์, ชนิดข้อมูลตัวเลข Quantity คำนวณได้จริง, FIFO Lot Details บันทึกในคอลัมน์ที่ 16 ไม่เกิด Double Counting (1 Transaction = 1 Row)
    - ยืนยันสิทธิ์เฉพาะ Supervisor เท่านั้น (Staff และ Admin ไม่เห็นปุ่มและถูกปฏิเสธด้วย 403)
  - **Automated Tests & Regression Verification ([frontend/__tests__/unit/reports-export.test.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/unit/reports-export.test.tsx))**:
    - เพิ่ม Unit Test ครอบคลุม 4 กรณีสำคัญสำหรับ Date Range:
      1. แจ้งเตือนเมื่อเลือก Start Date แต่ไม่มี End Date
      2. แจ้งเตือนเมื่อเลือก End Date แต่ไม่มี Start Date
      3. แจ้งเตือนเมื่อ Start Date > End Date
      4. ส่งออกสำเร็จเมื่อเลือกวันเดียวกัน (Same day)
    - Frontend Unit Tests (`npm test -- run`): 70/70 ผ่านทั้งหมด (6/6 test files)
    - Backend Tests (`npx vitest run`): 72/72 ผ่านทั้งหมด (3/3 test files) รวมถึง `export-excel.test.ts` (13/13)
    - E2E Playwright Tests: 3/3 ผ่านทั้งหมด
    - TypeScript Check (`npx tsc --noEmit`): 0 errors ทั้ง Frontend และ Backend
    - Production Build (`npm run build`): สำเร็จสมบูรณ์ 100% (12/12 static pages)
    - ESLint Check (`npx eslint app/reports/page.tsx lib/auth.ts __tests__/unit/reports-export.test.tsx`): 0 errors
    - Git Diff Check (`git diff --check`): ผ่าน 100% ไม่มีปัญหา Whitespace
    - ความปลอดภัยของระบบ: ไม่มีการแก้ไข Backend, ฐานข้อมูล, Schema, หรือติดตั้ง Package ใหม่ใด ๆ

- **เชื่อมต่อ Export Excel UI เข้ากับหน้ารายงาน (STEP 4.17.4 — Export Excel UI Integration) (เสร็จสมบูรณ์ 100%)**:
  - **เชื่อมต่อปุ่ม "ส่งออก Excel" ในหน้ารายงาน ([frontend/app/reports/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/reports/page.tsx))**:
    - เพิ่มปุ่ม "ส่งออก Excel" ใน Action Area ด้านบนขวา ถัดจากฟอร์มค้นหา (`Search form`) สอดคล้องกับ Layout และ Design System เดิมของ WPK MMS อย่างลงตัว
    - กำหนดสิทธิ์การมองเห็น (Role Visibility): แสดงปุ่มให้เฉพาะผู้ใช้ที่มีบทบาท **Supervisor** (`currentUser?.role === 'supervisor'`) เท่านั้น สำหรับ **Staff** และ **Admin** จะไม่แสดงปุ่มนี้บน UI
    - เชื่อมโยงการทำงานกับ `exportTransactionsToExcel()` และ `downloadBlob()` จาก `frontend/lib/auth.ts` (สร้างใน STEP 4.17.3) โดยไม่สร้าง Request ใหม่
    - ส่งตัวกรองปัจจุบันจาก State ของหน้ารายงานไปยัง API Helper โดยตรง ได้แก่ `startDate`, `endDate`, `status`, `search` (ดึงจากคำค้นหาที่ใช้งานอยู่), และ `category` (`all`, `adjust`, `normal`)
    - จัดการสถานะการทำงาน (Loading State): แสดงข้อความ "กำลังส่งออก..." พร้อมไอคอน `<Loader2 className="animate-spin" />` และปิดการใช้งานปุ่ม (`disabled={exporting}`) เพื่อป้องกันการกดปุ่มซ้ำ
    - จัดการข้อเสนอแนะเมื่อสำเร็จ (Success Feedback): เมื่อดาวน์โหลดไฟล์ Blob สำเร็จ จะแสดงแบนเนอร์สีเขียว "ส่งออกรายงาน Excel สำเร็จ" พร้อมไอคอน `<CheckCircle2 />` และเคลียร์ข้อความอัตโนมัติภายใน 4 วินาที
    - จัดการข้อผิดพลาด (Error Handling): รองรับข้อผิดพลาดจาก Backend เช่น 400, 401, 403, 404 ("ไม่พบข้อมูลสำหรับส่งออกตามเงื่อนไขที่ระบุ") และข้อผิดพลาดเครือข่าย โดยแสดงแบนเนอร์สีแดงแจ้งเตือนอย่างชัดเจน ไม่ค้าง Loading และปุ่มกลับมาใช้งานได้ตามปกติ
    - รักษาโครงสร้างเดิมของหน้ารายงาน 100%: ไม่แก้ไข Logic การโหลดข้อมูล (`loadTransactions`, `fetchTransactions`), ตารางแสดงผล, Pagination, หรือตัวกรองเดิมใด ๆ
  - **Automated Tests & Regression Verification ([frontend/__tests__/unit/reports-export.test.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/unit/reports-export.test.tsx))**:
    - เพิ่ม Unit Test ครอบคลุม 8 ข้อสำคัญ:
      1. ตรวจสอบ Supervisor เห็นปุ่ม "ส่งออก Excel"
      2. ตรวจสอบ Staff ไม่เห็นปุ่ม "ส่งออก Excel"
      3. ตรวจสอบ Admin ไม่เห็นปุ่ม "ส่งออก Excel"
      4. ตรวจสอบการกดปุ่มแล้วเรียก `exportTransactionsToExcel()` พร้อมส่ง Filter ปัจจุบันถูกต้อง และเรียก `downloadBlob()` เมื่อสำเร็จ
      5. ตรวจสอบ Loading State, Disabled State และการป้องกัน Double Click ขณะกำลังส่งออก
      6. ตรวจสอบกรณี 404 (ไม่พบข้อมูล) แสดงข้อความภาษาไทยและรีเซ็ตสถานะปุ่ม
      7. ตรวจสอบกรณี 403 (ไม่มีสิทธิ์) แสดงข้อความผิดพลาดและรีเซ็ตสถานะปุ่ม
      8. ตรวจสอบการแสดงผลตารางรายการธุรกรรมเดิมว่ายังคงทำงานได้อย่างสมบูรณ์
    - ผลทดสอบ Frontend Unit Tests (`npm test -- run`): 66/66 ผ่านทั้งหมด (6/6 test files)
    - ผลทดสอบ Backend Vitest (`npx vitest run`): 72/72 ผ่านทั้งหมด (3/3 test files)
    - ผลการตรวจสอบ TypeScript (`npx tsc --noEmit`): 0 errors ทั้ง Frontend และ Backend
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ 100% (12/12 static pages)
    - ESLint Check (`npx eslint app/reports/page.tsx lib/auth.ts __tests__/unit/reports-export.test.tsx`): 0 errors
    - ความปลอดภัยของระบบ: ไม่มีการแก้ไข Backend, ฐานข้อมูล, Schema, หรือติดตั้ง Package ใหม่ใด ๆ

- **พัฒนา Frontend Excel Export API Client Helper (STEP 4.17.3 — Frontend Excel Export API Client Helper) (เสร็จสมบูรณ์ 100%)**:
  - **สร้าง Frontend API Client Helper ([frontend/lib/auth.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/lib/auth.ts))**:
    - เพิ่มฟังก์ชัน `exportTransactionsToExcel(filter: ExportTransactionsFilter): Promise<ExportExcelResult>` สำหรับเชื่อมต่อกับ `GET /reports/export-excel`
    - รองรับตัวกรองชุดเดียวกับหน้ารายงาน: `startDate`, `endDate`, `status` (`pending`, `confirmed`, `rejected`), `search` (รหัสชิ้นส่วนสินค้า), และ `category` (`all`, `adjust`, `normal`)
    - สร้าง Query String โดยละเว้นพารามิเตอร์ที่ว่างเปล่าและละเว้น `category=all` อย่างถูกต้อง
    - แนบ Bearer Token อัตโนมัติจาก `getToken()` ตาม Architecture เดิมของระบบ
    - อ่าน Response ที่สำเร็จเป็น `Blob` (`response.blob()`) โดยไม่แปลงเป็น JSON หรือ Text
    - สกัดชื่อไฟล์ที่ Backend กำหนดจาก Header `Content-Disposition` (เช่น `WPK_MMS_Transaction_Report_2026-08-01_to_2026-08-31.xlsx`) พร้อม Fallback ชื่อไฟล์มาตรฐาน
    - จัดการ Error ทุกกรณี (400, 401, 403, 404, 500) โดยแปลงเป็น Error Message ภาษาไทยที่ชัดเจน และจัดการ Clear Session / Redirect เมื่อเจอ 401
    - เพิ่มฟังก์ชันตัวช่วย `downloadBlob(blob: Blob, filename: string): void` สำหรับดาวน์โหลดไฟล์ผ่าน Native Browser API (`createObjectURL` และ `revokeObjectURL`) เพื่อไม่ให้เกิด Memory Leak
    - ยืนยันว่า **ยังไม่ได้สร้างปุ่ม Export Excel** และ **ไม่ได้แก้ไขหน้า Reports UI หรือพฤติกรรมการโหลดข้อมูลเดิม** ในขั้นตอนนี้
  - **Automated Tests & Regression Verification ([frontend/__tests__/unit/auth.test.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/unit/auth.test.ts))**:
    - เพิ่ม Unit Test ครอบคลุม 8 กรณีสำหรับ `exportTransactionsToExcel` และ `downloadBlob`:
      1. ตรวจสอบการส่ง Query Parameters, Authorization Header และการรับ Blob พร้อมชื่อไฟล์
      2. ตรวจสอบการละเว้นพารามิเตอร์ที่ว่างเปล่าและ `category=all`
      3. ตรวจสอบการจัดการ Error 400 Bad Request
      4. ตรวจสอบการจัดการ Error 403 Forbidden
      5. ตรวจสอบการจัดการ Error 404 No Data
      6. ตรวจสอบการจัดการ Error 500 Internal Server Error
      7. ตรวจสอบการจัดการข้อผิดพลาดเมื่อไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้
      8. ตรวจสอบการทำงานของ `downloadBlob` (DOM anchor click และ revokeObjectURL)
    - Frontend Vitest: 58/58 PASS (100%)
    - TypeScript Type Check (`npx tsc --noEmit`): 0 errors ทั้ง Frontend และ Backend
    - Next.js Production Build (`npm run build`): สำเร็จสมบูรณ์ (12/12 static pages)
    - Backend API & Database: ไม่มีการแตะต้องหรือแก้ไขใด ๆ ทั้งสิ้น

- **พัฒนา Backend Excel Export API สำหรับหน้ารายงาน (STEP 4.17.2 — Backend Excel Export API Implementation) (เสร็จสมบูรณ์ 100%)**:
  - **สร้าง Endpoint ส่งออกไฟล์ Excel ([backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts))**:
    - เพิ่ม `GET /reports/export-excel` พร้อมระบบความปลอดภัย `authenticate` และ `requireRole('supervisor')`
    - จำกัดสิทธิ์เฉพาะบทบาท **Supervisor** เท่านั้น ส่วนบทบาท **Staff** และ **Admin** จะได้รับ `403 Forbidden` และผู้ที่ไม่มี Token จะได้รับ `401 Unauthorized`
    - รองรับตัวกรองชุดเดียวกับหน้ารายงานปัจจุบัน: `startDate`, `endDate`, `status` (`pending`, `confirmed`, `rejected`), `search` (รหัสสินค้า), และ `category` (`all`, `adjust`, `normal`)
    - ดึงข้อมูลจากฐานข้อมูลโดยตรง ไม่ผูกกับข้อจำกัด 200 รายการของหน้าจอ และกำหนด Safety Cap สูงสุด 5,000 รายการ (`take: 5000`)
    - สร้างโครงสร้างไฟล์ `.xlsx` ตามมาตรฐาน: 1 Transaction ต่อ 1 แถว พร้อมรวบรวมข้อมูล Lot FIFO ในคอลัมน์ "รายละเอียด Lot (FIFO)" เพื่อป้องกัน Double Counting ยอดรวม Quantity
    - นำ Package `xlsx` ที่มีอยู่แล้วใน Backend มา Reuse โดยไม่ต้องติดตั้ง Package ใหม่ใด ๆ
    - รองรับการตั้งชื่อไฟล์อัตโนมัติตามช่วงเวลาที่เลือก และส่งออกด้วย Content-Type `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    - จัดการกรณีไม่พบข้อมูลด้วย `404 Not Found` (`{ error: 'ไม่พบข้อมูลสำหรับส่งออกตามเงื่อนไขที่ระบุ' }`) และตรวจสอบความถูกต้องของ Filter ด้วย `400 Bad Request`
  - **Automated Tests & Regression Verification ([backend/__tests__/export-excel.test.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/__tests__/export-excel.test.ts))**:
    - เพิ่มชุดทดสอบ Integration Test ครอบคลุม 13 ข้อ:
      1. ตรวจสอบ Unauthenticated Request ได้รับ 401 Unauthorized
      2. ตรวจสอบ Invalid Token ได้รับ 401 Unauthorized
      3. ตรวจสอบ Staff ได้รับ 403 Forbidden
      4. ตรวจสอบ Admin ได้รับ 403 Forbidden
      5. ตรวจสอบ Invalid Status ได้รับ 400 Bad Request
      6. ตรวจสอบ Invalid Category ได้รับ 400 Bad Request
      7. ตรวจสอบ Missing EndDate เมื่อมี StartDate ได้รับ 400 Bad Request
      8. ตรวจสอบ Invalid Date Format ได้รับ 400 Bad Request
      9. ตรวจสอบ StartDate > EndDate ได้รับ 400 Bad Request
      10. ตรวจสอบ Filter ไม่พบข้อมูลได้รับ 404 Not Found
      11. ตรวจสอบ Supervisor ส่งออกไฟล์ Excel สำเร็จ ได้รับ Buffer `.xlsx` และข้อมูลคอลัมน์ครบ 16 คอลัมน์ พร้อมรองรับภาษาไทย
      12. ตรวจสอบ Filter Date Range และชื่อไฟล์ที่ถูกต้อง
      13. ตรวจสอบ Filter Category (`adjust` vs `normal`) กรองตรงตามเงื่อนไข Note
    - Backend Vitest: 13/13 PASS (export-excel.test.ts) และ 39/39 PASS (api.test.ts) รวมผ่าน 100%
    - TypeScript Type Check: 0 errors ทั้งฝั่ง Backend (`npx tsc --noEmit`)
    - Database Integrity: ข้อมูลทั้งหมดในฐานข้อมูลคงเดิม 100% ไม่มีการเปลี่ยน Schema หรือแก้ไขข้อมูลจริง

- **กำหนด Default Status Filter เป็น "ทั้งหมด" สำหรับ Staff (STEP 4.16.3 — Staff Default Transaction Filter) (เสร็จสมบูรณ์ 100%)**:
  - **Staff Default Filter ([frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx))**:
    - ปรับปรุงให้เมื่อผู้ใช้มีบทบาทเป็น `warehouse_staff` เปิดเข้าสู่หน้า `/transactions` ("รายการของฉัน") เป็นครั้งแรก ระบบจะกำหนดตัวกรองสถานะเริ่มต้น (`statusFilter`) เป็น **"ทั้งหมด" (`all`)** โดยอัตโนมัติ เพื่อให้พนักงานสามารถเห็นประวัติการรับเข้า/เบิกออกของตนเองครบถ้วนทันที
    - สำหรับบทบาท `supervisor` ยังคงกำหนดตัวกรองเริ่มต้นเป็น **"รออนุมัติ" (`pending`)** เช่นเดิม เพื่อให้หัวหน้างานเห็นรายการที่ต้องเข้าตรวจสอบและอนุมัติทันที
    - จัดลำดับตัวเลือกใน Dropdown สถานะให้ Staff เห็น **"ทั้งหมด"** เป็นตัวเลือกแรก ในขณะที่ Supervisor เห็น **"รออนุมัติ"** เป็นตัวเลือกแรก
    - หลังเปิดหน้าแล้ว Staff ยังคงสามารถเลือกสลับดูรายการเฉพาะ `รออนุมัติ`, `อนุมัติแล้ว`, หรือ `ปฏิเสธ` ได้ตามปกติ
  - **Navigation Badge Isolation**:
    - ตัวเลข Badge บนเมนูนำทางยังคงนับเฉพาะจำนวนรายการรออนุมัติของ Staff (`pending`) โดยแยก Logic จาก Default Filter ในหน้ารายการอย่างถูกต้อง
  - **Automated Tests & Regression Verification ([frontend/__tests__/e2e/roles.spec.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/e2e/roles.spec.ts))**:
    - เพิ่มการตรวจสอบใน Playwright E2E ยืนยันว่า Staff เปิดหน้าแรกได้ค่าเริ่มต้นเป็น `all` และสามารถเลือกเปลี่ยนเป็น `pending` ได้ ในขณะที่ Supervisor เปิดหน้าแรกได้ค่าเริ่มต้นเป็น `pending`
    - Playwright E2E: 18/18 PASS (100%)
    - Frontend Vitest: 50/50 PASS (100%)
    - Backend Vitest: 59/59 PASS (100%)
    - TypeScript Type Check: 0 errors ทั้งฝั่ง Backend และ Frontend
    - Next.js Production Build: สำเร็จสมบูรณ์ (12/12 static pages)
    - Database Integrity: ข้อมูลทั้งหมดในฐานข้อมูลคงเดิม 100%

- **ปรับปรุง UI/UX หน้ารายการสำหรับ Staff ให้เป็น "รายการของฉัน" (STEP 4.16.2 — Staff “My Transactions” UI/UX) (เสร็จสมบูรณ์ 100%)**:
  - **Staff Transaction Page UI ([frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx))**:
    - **Page Title & Subtitle**: เมื่อผู้ใช้มีบทบาทเป็น `warehouse_staff` หน้าจอจะแสดงหัวข้อ **"รายการของฉัน"** พร้อมคำอธิบายย่อย *"ติดตามและตรวจสอบสถานะรายการรับเข้าและเบิกออกของคุณ"* ส่วน Supervisor ยังคงแสดง **"รายการรอการยืนยัน"** เพื่อใช้ในการอนุมัติงานตามเดิม
    - **Empty State UX**: ปรับข้อความเมื่อไม่มีรายการสำหรับ Staff ให้ระบุชัดเจน เช่น *"ไม่มีรายการของคุณที่รอการยืนยัน"*, *"ไม่มีรายการของคุณที่ได้รับการอนุมัติ"*, *"ไม่มีรายการของคุณที่ถูกปฏิเสธ"*, และ *"ยังไม่มีรายการของคุณในระบบ"*
    - **Status Filter & Badge**: ตัวกรองสถานะ (`รออนุมัติ`, `ทั้งหมด`, `อนุมัติแล้ว`, `ปฏิเสธ`) และตัวเลข Badge ในเมนูนำทาง (`Navigation.tsx`) คำนวณจากรายการของ Staff คนนั้นโดยตรงและถูกต้องโดยอัตโนมัติตาม Backend Source of Truth
    - **Role Boundary & Controls**: Staff มองไม่เห็นปุ่ม "อนุมัติ" / "ปฏิเสธ" และไม่มีการแสดง Accordion การตัดสต็อก FIFO Lot เช่นเดิม
  - **Automated Tests & Regression Verification ([frontend/__tests__/e2e/roles.spec.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/e2e/roles.spec.ts))**:
    - อัปเดต Playwright E2E ให้ตรวจสอบว่า Staff เห็นหัวข้อ "รายการของฉัน", ซ่อนปุ่มอนุมัติ/ปฏิเสธ และซ่อนส่วน FIFO ตัดสต็อก
    - Playwright E2E: 18/18 PASS (100%)
    - Frontend Vitest: 50/50 PASS (100%)
    - Backend Vitest: 59/59 PASS (100%)
    - TypeScript Type Check: 0 errors ทั้งฝั่ง Backend และ Frontend
    - Next.js Production Build: สำเร็จสมบูรณ์ (12/12 static pages)
    - Database Integrity: ข้อมูลทั้งหมดในฐานข้อมูลคงเดิม 100%

- **แก้ไขปัญหา Security / Requirement Gap ฝั่ง Backend ให้ Staff ดูได้เฉพาะรายการของตนเอง (STEP 4.16.1 — Staff “My Transactions” Backend Authorization Fix) (เสร็จสมบูรณ์ 100%)**:
  - **Backend Ownership Authorization ([backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts))**:
    - แก้ไข `app.get('/transactions')` ให้ตรวจสอบบทบาทของผู้ใช้จาก JWT Token (`req.user?.role`)
    - หากผู้ใช้มีบทบาทเป็น `warehouse_staff` ระบบจะบังคับใส่เงื่อนไข `whereClause.createdById = req.user.id` โดยอัตโนมัติ ทำให้ Staff ได้รับเฉพาะ Transaction ที่ตนเองเป็นผู้สร้างเท่านั้น
    - หากเป็น `supervisor` หรือ `admin` ระบบยังคงพฤติกรรมเดิม ไม่มีการใส่ filter `createdById` ทำให้ Supervisor ยังคงเห็น Transaction ทั้งหมดในคลังเพื่อใช้ในการตรวจสอบและ Confirm/Reject ได้ครบถ้วน
    - ป้องกันความปลอดภัย: ไม่มีการรับ `createdById` หรือ `userId` จาก Query Parameter ทำให้ Staff ไม่สามารถ Bypass เพื่อดูข้อมูลของพนักงานคนอื่นได้
    - ไม่มีการแก้ไข Endpoint สร้าง Transaction (`POST /transactions` ยังคงผูก `createdById: req.user.id` จาก JWT เช่นเดิม)
  - **Automated Tests & Regression Verification ([backend/__tests__/api.test.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/__tests__/api.test.ts))**:
    - เพิ่มชุดทดสอบ Security & Role Boundary สำหรับ `GET /transactions` รวม 8 ข้อ ทดสอบครอบคลุม:
      1. Staff เห็นเฉพาะ Transaction ของตนเอง (`createdById === 7`)
      2. Staff ไม่สามารถ bypass filter ผ่าน query parameters (`?createdById=6&userId=6`)
      3. Staff สามารถใช้งาน filter อื่นๆ เช่น `status=pending` ภายในรายการของตนเองได้
      4. Staff สามารถใช้งาน search filter ภายในรายการของตนเองได้
      5. Supervisor ยังคงเห็น Transaction ทั้งหมดจากทุกผู้สร้าง
      6. Admin ยังคงพฤติกรรมเดิมตาม Role Architecture
      7. `POST /transactions` บันทึก `createdById` จาก JWT อย่างถูกต้อง
      8. Staff พยายามกด Confirm/Reject ยังคงถูกบล็อกด้วย 403 Forbidden
    - Backend Vitest: 59/59 PASS (100%)
    - Frontend Vitest: 50/50 PASS (100%)
    - Playwright E2E: 18/18 PASS (100%)
    - TypeScript Type Check: 0 errors ทั้งฝั่ง Backend และ Frontend
    - Next.js Production Build: สำเร็จสมบูรณ์ (12/12 static pages)
    - Backend Build (`npx tsc`): สำเร็จสมบูรณ์ 0 errors
    - Database Integrity: ข้อมูล Products (44 รายการ), Packaging (24 รายการ), Lots (24 รายการ), Transactions (16 รายการ), BOMs (118 รายการ), Users (11 บัญชี) คงเดิมทุกประการ ไม่มีการเปลี่ยนแปลงข้อมูลจริง

## 8 ก.ย. 2026
- **ปรับปรุงความปลอดภัยของระบบและการจำกัดขอบเขตสิทธิ์ (STEP 4.14.2 — Security & Role Boundary Hardening) (เสร็จสมบูรณ์ 100%)**:
  - **FIX #1: Authentication Fast-path Alignment ([backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts))**:
    - ปรับปรุง Fast-path Login ของ `admin` และ `staff` ให้ตรวจสอบข้อมูลจริงกับฐานข้อมูล (Database) ด้วย `bcrypt.compare` และตรวจสอบสถานะบัญชี `status` เช่นเดียวกับ `supervisor`
    - หากสถานะบัญชีเป็น `disabled` หรือ `rejected` ระบบจะบล็อกการเข้าสู่ระบบและตอบกลับ HTTP 403 Forbidden ทันที
    - โทเค็น JWT และข้อมูลผู้ใช้ใช้ User ID จริงจากฐานข้อมูล (`admin` ID: 6, `staff` ID: 7, `supervisor` ID: 10)
    - คงการทำงานของ Supervisor ไว้อย่างถูกต้องตามเดิม และคง Fallback ID ที่ถูกต้องเฉพาะกรณีเกิด Database Connection Error เท่านั้น
  - **FIX #2: Backend Role Guard on POST /transactions ([backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts))**:
    - ติดตั้ง Middleware `requireRole('warehouse_staff', 'supervisor')` ให้กับ `POST /transactions`
    - กำหนดให้เฉพาะบทบาท `warehouse_staff` (พนักงานทั่วไป) และ `supervisor` (หัวหน้างาน) เท่านั้นที่สามารถสร้างรายการรับเข้า/เบิกออกได้
    - บล็อกสิทธิ์ `admin` ไม่ให้สามารถทำรายการ Transaction สต็อกสินค้า โดยตอบกลับ HTTP 403 Forbidden เพื่อรักษาหลักการ Separation of Duties (Admin จัดการเฉพาะ User เท่านั้น)
    - คำขอที่ไม่มี Token จะถูกปฏิเสธด้วย HTTP 401 Unauthorized
    - ไม่มีการเปลี่ยนแปลง Business Logic ในการคำนวณสต็อก, FIFO, ProductLot หรือ Lifecycle ใดๆ ทั้งสิ้น
  - **Automated Tests & Regression Verification ([backend/__tests__/api.test.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/__tests__/api.test.ts))**:
    - เพิ่มชุดทดสอบ Security & Role Boundary Hardening 10 ข้อ ครอบคลุมการเข้าสู่ระบบแบบปกติและแบบระงับการใช้งานของทั้ง 3 Roles, การตรวจสอบ User ID ใน JWT, และการทดสอบ Role Guard ของ `POST /transactions`
    - Backend Vitest: 31/31 PASS (100%)
    - Frontend Vitest: 30/30 PASS (100%)
    - Playwright E2E: 18/18 PASS (100%)
    - TypeScript Type Check: 0 errors ทั้งฝั่ง Backend และ Frontend
    - Next.js Production Build: สำเร็จสมบูรณ์ (12/12 static pages)
    - Database Integrity: ข้อมูล Products (44 รายการ), Packaging (24 รายการ), Lots (24 รายการ), Transactions (16 รายการ), BOMs (118 รายการ) คงเดิมทุกประการ ไม่มีการเปลี่ยนแปลงของสต็อกหรือข้อมูล Master Users

- **พัฒนา Frontend UI/UX สำหรับ Product Lifecycle Active/Inactive เน้นเฉพาะหมวด Packaging (STEP 4.12.3) (เสร็จสมบูรณ์ 100%)**:
  - **Interface & API Helper ([frontend/lib/auth.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/lib/auth.ts))**:
    - อัปเดต `interface Product` ให้รองรับฟิลด์ `status?: 'active' | 'inactive' | string` จาก Backend
    - เพิ่มฟังก์ชัน `updateProductStatus(id, status)` สำหรับส่งคำขอ `PATCH /products/:id/status`
  - **หน้าคลังสินค้าและสต็อก ([frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx))**:
    - **Status Badge**: แสดงสถานะ Active (สีเขียว `Active (ใช้งานอยู่)`) หรือ Inactive (สีแดง `Inactive (ปิดใช้งาน)`) บนการ์ดบรรจุภัณฑ์และในตาราง Flat View
    - **Supervisor Status Action**: แสดงปุ่ม "ปิดใช้งาน" เมื่อสินค้าเป็น Active และปุ่ม "เปิดใช้งาน" เมื่อสินค้าเป็น Inactive เฉพาะผู้ใช้ที่มีสิทธิ์ `supervisor` และสินค้าเป็นประเภท `Packaging` เท่านั้น (Admin และ Staff มองไม่เห็นปุ่มนี้)
    - **Confirmation Modal**: แสดงกล่องข้อความยืนยันก่อนเปลี่ยนสถานะ ป้องกันการกดโดยไม่ได้ตั้งใจ พร้อมสถานะ Loading และป้องกัน Double-click
    - **Status Filter**: เพิ่มแถบตัวกรองสถานะสำหรับ Packaging ([ทั้งหมด] [Active] [Inactive]) ที่ทำงานร่วมกับ Search และ Category Subtabs โดยไม่กระทบ Layout เดิม
    - **Direct Stock Edit Guard**: ปิดกั้น (Disable) การแก้ไขจำนวนสต็อกคงเหลือโดยตรงสำหรับสินค้าที่ Inactive
  - **หน้าสแกนสินค้า ([frontend/app/scan/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/scan/page.tsx))**:
    - แสดง Status Badge ในส่วนหัวของรายละเอียดสินค้าเมื่อสแกนพบ
    - หากสินค้ามีสถานะ Inactive: ซ่อนฟอร์มรับเข้า/เบิกออก และแสดงแบนเนอร์แจ้งเตือน "สินค้านี้ถูกปิดการใช้งาน ไม่สามารถทำรายการรับเข้าหรือเบิกออกได้"
    - ติดตั้ง Client-side Guard ใน `submitTransaction` เพื่อบล็อกการส่งคำขอหากสินค้า Inactive
  - **ผลการทดสอบและการตรวจสอบความสมบูรณ์ (Verification)**:
    - Frontend TypeScript Check: 0 errors
    - Backend TypeScript Check: 0 errors
    - Frontend Vitest: 30/30 PASS (เพิ่ม 14 unit tests ครอบคลุม Status API, Role UI Logic, Filter, และ Scan Inactive Guard)
    - Backend Vitest: 21/21 PASS
    - Playwright E2E: 18/18 PASS
    - รวม Automated Tests: 69/69 PASS (100%)
    - Next.js Production Build: สำเร็จสมบูรณ์ (12/12 static pages)
    - Database Integrity: ข้อมูลสินค้า 44 รายการ (Active 100%), สต็อกรวม 176.2023, Lots 24, Transactions 16, BOM 118 คงเดิมทุกประการ

- **พัฒนาตรรกะ Product Lifecycle และ Guards สำหรับการเปลี่ยนสถานะและการลบสินค้า (STEP 4.12.2 — Product Lifecycle Backend Logic) (เสร็จสมบูรณ์ 100%)**:
  - **PATCH /products/:id/status (Product Status API)**:
    - เพิ่ม Endpoint ปรับเปลี่ยนสถานะสินค้า Active / Inactive
    - กำหนดสิทธิ์ให้เฉพาะ `supervisor` เท่านั้น (Admin คืนค่า 403, Staff คืนค่า 403)
    - บังคับ Scope เฉพาะสินค้าประเภท Packaging (`itemType === 'Packaging'`) หากเป็นประเภทอื่นจะคืนค่า 400 Bad Request
    - ตรวจสอบค่าสถานะอย่างเข้มงวด รับเฉพาะ `'active'` หรือ `'inactive'` (หากส่งค่าอื่น คืนค่า 400 Bad Request)
  - **Inactive Guards สำหรับ Transactions และ Stock Quantity**:
    - **POST /transactions**: ตรวจสอบสถานะสินค้า หาก `status === 'inactive'` จะปฏิเสธการทำรายการรับเข้า (Receive) หรือเบิกออก (Issue) ทันที พร้อมส่ง HTTP 409 Conflict เพื่อป้องกันการเคลื่อนไหวสต็อกของบรรจุภัณฑ์ที่เลิกใช้งานแล้ว
    - **PATCH /products/:id/quantity**: หากสินค้ามี `status === 'inactive'` จะปฏิเสธการแก้ไขจำนวนสต็อก พร้อมส่ง HTTP 409 Conflict
  - **4 Strict Hard Delete Guards สำหรับ DELETE /products/:id**:
    - ยกเลิกคำสั่ง `prisma.transaction.deleteMany` เพื่อรักษา Audit Trail และประวัติย้อนหลังของระบบ 100%
    - **Guard 1 (Quantity Guard)**: ตรวจสอบ `quantity === 0` หากยังมีสต็อกคงเหลือจะไม่อนุญาตให้ลบ คืนค่า 400 Bad Request
    - **Guard 2 (Transaction Guard)**: ตรวจสอบว่าไม่มีประวัติ Transaction ใดๆ อ้างอิงสินค้านี้ หากมีคืนค่า 409 Conflict
    - **Guard 3 (ProductLot Guard)**: ตรวจสอบว่าไม่มีประวัติ ProductLot อ้างอิงสินค้านี้ หากมีคืนค่า 409 Conflict
    - **Guard 4 (BOM Guard)**: ตรวจสอบว่าไม่มีการอ้างอิงสินค้าทั้งในฐานะ Parent หรือ Component ของ Bill of Material (BOM) หากมีคืนค่า 409 Conflict
    - หากผ่านครบทุก Guard และเป็นสิทธิ์ Supervisor ระบบจะอนุญาตให้ลบสินค้าได้ตามปกติ
  - **การรักษาความสมบูรณ์ของข้อมูล (Database Integrity & Zero Regression)**:
    - ไม่มีการแก้ไข Frontend UI หรือเปลี่ยนแปลงดีไซน์ใดๆ ในขั้นตอนนี้
    - ข้อมูลสินค้าในระบบคงเดิมทั้ง 44 รายการ (Active 100%), สต็อกรวม 176.2023, ProductLot 24 รายการ, Transaction 16 รายการ, BOM 118 รายการ, User 11 บัญชี ไม่มีการเปลี่ยนแปลงหรือสูญหาย
    - อัลกอริทึม FIFO และข้อมูล Allocation ย้อนหลังยังคงเดิม 100%
  - **ผลการทดสอบทั้งหมด (55/55 PASS 100%)**:
    - Backend Vitest: 21/21 PASS (เพิ่มชุดทดสอบครอบคลุม Status API, Inactive Guards, และ Hard Delete Guards 1-4)
    - Frontend Vitest: 16/16 PASS
    - Playwright E2E: 18/18 PASS
    - Next.js Build: ผ่านสมบูรณ์ (12/12 static pages)
    - TypeScript: 0 errors ทั้งฝั่ง Backend และ Frontend

- **เพิ่มสถานะสินค้า Product Active / Inactive ใน Schema และ Database (STEP 4.12.1) (เสร็จสมบูรณ์ 100%)**:
  - **Prisma Schema ([backend/prisma/schema.prisma](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/prisma/schema.prisma))**:
    - เพิ่มคอลัมน์ `status String @default("active")` ในโมเดล `Product`
    - เพิ่ม Index `@@index([status])` เพื่อประสิทธิภาพในการ Query
  - **Database Migration (Supabase PostgreSQL)**:
    - รันคำสั่ง `npx prisma db push` ปรับโครงสร้างตาราง `Product` ใน Supabase สำเร็จ โดยไม่มีการ reset หรือสูญหายของข้อมูล
    - ข้อมูลสินค้าเดิมทั้งหมด 44 รายการได้รับค่า `status = 'active'` ครบถ้วน 100%
    - จำนวนสินค้า (44 รายการ), ยอดสต็อกรวม (176.2023), ProductLot (24 lots), Transaction (16 รายการ), BOM (118 รายการ), User (11 บัญชี) คงเดิมทุกประการ ไม่มีการเปลี่ยนแปลง
  - **ผลการทดสอบ (Verification & Zero Regression)**:
    - Backend TypeScript Check: 0 errors
    - Frontend TypeScript Check: 0 errors
    - Backend Vitest: 4/4 PASS
    - Frontend Vitest: 16/16 PASS
    - Playwright E2E: 18/18 PASS (รวม Automated Tests 38/38 PASS 100%)
    - Next.js Production Build: สำเร็จ (12/12 static pages)
    - Backend tsc build: สำเร็จ

- **ถอดปุ่มลบสินค้าออกจากหน้าคลังสินค้า/สต็อกเพื่อความปลอดภัยของ Master Data (STEP 4.11.8 — Product Delete Button Removal) (เสร็จสมบูรณ์ 100%)**:
  - **การวิเคราะห์ผลกระทบและความปลอดภัยของข้อมูล (Master Data Safety & Impact Analysis)**:
    - ข้อมูลสินค้า (`Product`) ในระบบ WPK MMS ถือเป็น Master Data หลักที่มีความสัมพันธ์กับตาราง `Transaction`, `ProductLot`, `TransactionLotAllocation`, `BillOfMaterial` และรายงานย้อนหลัง
    - เพื่อป้องกันการลบข้อมูลสินค้าโดยไม่ตั้งใจ จึงทำการถอดปุ่ม "ลบสินค้า" (Delete Product) ออกจากหน้าจัดการสต็อกคลังสินค้า (`/inventory`) ทั้งหมด
  - **การแก้ไขในส่วนแสดงผล ([frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx))**:
    1. ถอดปุ่มลบสินค้า (`Trash2`) และคอลัมน์หัวตาราง "จัดการ" ออกจากตาราง Flat View (หมวด Packaging / Active Tab)
    2. ถอดปุ่ม "ลบรายการ" ออกจากส่วน Action Buttons ท้ายการ์ด Group Card ของ Parent FG แต่ละรายการ
    3. ถอดปุ่มลบสินค้าและคอลัมน์หัวตาราง "จัดการ" ออกจากตาราง Unassigned Items
    4. ถอดปุ่มลบสินค้าและคอลัมน์หัวตาราง "จัดการ" ออกจากตาราง All Products Flat View พร้อมปรับ `colSpan` เป็น 5 สำหรับ Empty State
  - **คงสภาพระบบส่วนอื่นโดยสมบูรณ์ (Zero Regression)**:
    - Backend API `DELETE /products/:id` และ Authorization สิทธิ์ `supervisor` คงเดิม ไม่มีการแก้ไข Backend หรือฐานข้อมูล
    - ไม่มีการแก้ไข Schema, Database Data, FIFO Logic, Transaction Workflow หรือ Role Permission อื่นใด
    - ผลการรันชุดทดสอบ Regression: Backend Vitest 4/4 PASS, Frontend Vitest 16/16 PASS, Playwright E2E 18/18 PASS, TypeScript 0 errors รวม 38/38 PASS 100%

## 7 ก.ย. 2026
- **แก้ไขปัญหาความไม่สอดคล้องของบัญชี Supervisor (Supervisor Account Role Inconsistency Resolution) (เสร็จสมบูรณ์ 100%)**:
  - **การวิเคราะห์ผลกระทบและสาเหตุ (Root Cause & Impact Analysis)**:
    - บัญชีผู้ใช้งาน ID 10 (`username: 'supervisor'`, `fullName: 'ผู้ควบคุมดูแลระบบ (Supervisor)'`) มีตัวตนอยู่จริงในฐานข้อมูล Supabase PostgreSQL แต่คอลัมน์ `role` มีค่าเป็น `'admin'` ตกค้างมาตั้งแต่การรันสคริปต์ `importMasterData.ts` ในยุคแรกที่ระบบยังไม่มีการแยก 3 Roles
    - โค้ด Login Fast-Path ใน `backend/src/index.ts` มีการ hardcode คืนค่า `{ id: 6, username: 'supervisor', role: 'supervisor' }` ซึ่งทำให้ User ID ขัดแย้งกับบัญชี User ID 6 (`admin`) ใน Database
  - **การแก้ไขที่ดำเนินการ (Minimal Safe Fix)**:
    1. **Database**: ปรับปรุงข้อมูลบัญชี User ID 10 เดิมในฐานข้อมูล Supabase ให้มี `role = 'supervisor'` อย่างถูกต้อง โดยไม่สร้างบัญชีใหม่ ไม่ลบข้อมูลเดิม และไม่แตะต้องบัญชีอื่น
    2. **Backend API (`backend/src/index.ts`)**: ปรับปรุงส่วน Login สำหรับ `supervisor` ให้ดึงข้อมูลจากตาราง `User` ใน Database เพื่อสร้าง JWT ด้วย `userId = 10` และ `role = 'supervisor'` ที่สอดคล้องกันทุกจุด
    3. **Seed Script (`backend/src/importMasterData.ts`)**: อัปเดตการ Seed ของ `username: 'supervisor'` ให้เป็น `role: 'supervisor'` ป้องกันการเขียนทับเป็น `admin` ในอนาคต
  - **การตรวจสอบความถูกต้องและผลการทดสอบ (Verification)**:
    - สัดส่วนผู้ใช้ในฐานข้อมูล: `admin: 1` (ID 6), `supervisor: 1` (ID 10), `warehouse_staff: 9` (รวม 11 บัญชี)
    - ยืนยันการเข้าสู่ระบบ: บัญชี `supervisor` / `super1234` ได้รับ JWT `userId: 10`, `role: 'supervisor'`
    - ยืนยันการทำงานของระบบคลังและสิทธิ์ RBAC ทั้ง 3 Roles สมบูรณ์ ไม่กระทบ Stock, Lot, FIFO, หรือ Transaction
    - ผลการทดสอบอัตโนมัติ: TypeScript 0 errors, Vitest Backend 4/4 PASS, Vitest Frontend 16/16 PASS, Playwright E2E 18/18 PASS รวม 38/38 PASS 100%
- **แก้ไข Assertion ใน Automated Test ให้สอดคล้องกับ Production UI (STEP 4.10.8.1 — Fix Automated Test Assertion Mismatch) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขเฉพาะไฟล์ [frontend/__tests__/e2e/flows.spec.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี%204/ปี%204%20เทอม%201/ฝึกงาน/QR%20Code%20Webapp/frontend/__tests__/e2e/flows.spec.ts) (บรรทัดที่ 150):
    - ปรับแก้ Assertion ใน Flow 8 (BOM View Modal) จาก `text=สูตรโครงสร้าง BOM` เป็น `text=Bill of Materials (BOM)` ให้ตรงกับหัวข้อหน้าต่าง Modal จริงของ Production UI ใน [frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี%204/ปี%204%20เทอม%201/ฝึกงาน/QR%20Code%20Webapp/frontend/app/inventory/page.tsx)
    - ยึดหลักการ "แก้ Test ให้ตรงกับ Production UI ไม่ใช่แก้ Production UI ให้ตรงกับ Test"
  - **ผลการรันชุดการทดสอบ Regression ครบถ้วน 100%**:
    - **TypeScript**: Backend (`0 errors`) และ Frontend (`0 errors`) ผ่านสมบูรณ์
    - **Backend Vitest**: 4/4 Tests ผ่าน (100% PASS)
    - **Frontend Vitest**: 16/16 Tests ผ่าน (100% PASS)
    - **Playwright E2E**: 18/18 Tests ผ่านครบถ้วน (100% PASS)
    - **รวมทั้งหมด**: 38/38 Tests ผ่าน (0 Failed, 0 Skipped)
  - **ความปลอดภัยของระบบ**: ไม่มีการแก้ไข Production Code, UI/UX, Database, หรือ Prisma Schema ใด ๆ ทั้งสิ้น (`PRODUCTION FILES CHANGED: NONE`)
- **ปรับปรุง Test และ Documentation ให้สอดคล้องกับการแยกบทบาท 3 Roles (STEP 4.10.3 — Test & Documentation Consistency Fix) (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการปรับปรุงชุดการทดสอบอัตโนมัติ (Automated Tests) และเอกสาร (Documentation) เพื่อสะท้อนการแยกสิทธิ์ 3 บทบาทเด็ดขาด (`ADMIN ≠ SUPERVISOR ≠ STAFF`):
    1. **E2E Role Tests** ใน [frontend/__tests__/e2e/roles.spec.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/e2e/roles.spec.ts):
       - ตรวจสอบยืนยันสิทธิ์ Supervisor: ล็อกอินสำเร็จ เข้าถึงธุรกรรม เห็นปุ่มอนุมัติ/ปฏิเสธ และเข้าถึงสต็อก Lot ได้ครบถ้วน
       - ตรวจสอบยืนยันสิทธิ์ Staff: ล็อกอินสำเร็จ เข้าถึงการสแกน รับ/จ่าย ซ่อนปุ่มอนุมัติ/ปฏิเสธและสต็อก Lot อย่างเข้มงวด
       - ตรวจสอบยืนยันสิทธิ์ Admin: ล็อกอินสำเร็จ เข้าถึงหน้าจัดการผู้ใช้งาน (`/users`) ได้อย่างถูกต้อง และซ่อนปุ่มอนุมัติธุรกรรม
       - ระบุ Pattern Mock API ที่เจาะจงพอร์ต Backend (`*/**:4000/...`) และตัดการใช้ `any` ออก 100%
    2. **E2E Flow Tests** ใน [frontend/__tests__/e2e/flows.spec.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/__tests__/e2e/flows.spec.ts):
       - ปรับปรุง Mock User ใน `mockSupervisorLogin` ให้ใช้ `role: 'supervisor'` (`username: 'supervisor'`) สำหรับทดสอบ Warehouse & Approval Flows
       - ปรับปรุง Route Assertions ให้ตรงกับ Route จริง (`/` แทน `/dashboard`) และปรับ Heading Locators ให้สอดคล้องกับหน้าเว็บจริง
    3. **Documentation Alignment**:
       - [CONTEXT.md](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/CONTEXT.md): ปรับคำอธิบายบทบาทและ Flow แยกหน้าที่ 3 บทบาทชัดเจน (Admin = User Management, Supervisor = คลัง/อนุมัติ, Staff = ปฏิบัติการ)
       - [PRODUCT.md](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/PRODUCT.md): อัปเดตนิยามบทบาทผู้ใช้งานในระบบ WPK MMS ตามมาตรฐาน 3 Roles
       - [AUTH_SETUP.md](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/AUTH_SETUP.md): บันทึกตาราง Permission Matrix และขอบเขตความรับผิดชอบอย่างชัดเจน
  - **ผลการทดสอบครบทุกระบบ**:
    - **Vitest (Backend)**: ผ่าน 4/4 Tests (100% PASS)
    - **Vitest (Frontend)**: ผ่าน 16/16 Tests (100% PASS)
    - **Playwright (E2E)**: ผ่านครบ 18/18 Tests (100% PASS)
    - **TypeScript Type Check**: `tsc --noEmit` ทั้ง Frontend และ Backend ผ่าน 100% (0 errors)
  - **ความปลอดภัยของระบบ Production Code**: ไม่มีการแก้ไข Production Logic, Database, Prisma Schema, FIFO Logic หรือ Notification Logic ใดๆ ทั้งสิ้น (`NO PRODUCTION FUNCTIONAL CODE CHANGED`)
- **แก้ไขการแยกสิทธิ์ 3 บทบาทให้สอดคล้องตามข้อกำหนดทางธุรกิจ (STEP 4.10.2 — Functional Role Separation Fix) (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการแก้ไขเฉพาะจุดตามขอบเขต Scope Control อย่างเคร่งครัด (3 ไฟล์เท่านั้น):
    1. **Backend Notification** ใน [backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts): ปรับปรุง `POST /transactions` ให้สร้าง Notification ประเภท `pending_approval` ส่งตรงไปยัง `targetRole: 'supervisor'` แทน `'admin'`
    2. **Frontend Transactions UI** ใน [frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx): ปรับเงื่อนไขการแสดงปุ่ม **"อนุมัติ" / "ปฏิเสธ"** และส่วนขยาย **FIFO Lot Allocation** ให้แสดงเฉพาะ `user?.role === 'supervisor'` เท่านั้น (ซ่อนไม่ให้ Admin และ Staff เข้าถึง)
    3. **Frontend Inventory UI** ใน [frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx): ปรับเงื่อนไขการแสดงปุ่ม **"ดูสต็อกแยกตาม Lot"** (ทั้ง Card View และ Flat View) รวมถึง Guard ในฟังก์ชัน `openLotModal` ให้เข้าถึงได้เฉพาะ `user?.role === 'supervisor'` เท่านั้น (ซ่อนไม่ให้ Admin และ Staff เข้าถึง)
  - **การรักษากฎความปลอดภัยและข้อกำหนดหลัก**:
    - **Backend Permission**: คง `requireRole('supervisor')` บน Endpoints คลังและธุรกรรมตามเดิม (Staff -> 403, Supervisor -> 200, Admin -> 403)
    - **FIFO Engine & Stock Logic**: ไม่มีการแตะต้อง `ProductLot`, `TransactionLotAllocation`, FIFO Ordering หรือการคำนวณสต็อกใดๆ
    - **Data Safety**: ไม่มีการแก้ไขหรือแทรกแซง Production Master Data ใดๆ ทั้งสิ้น (`NO PRODUCTION DATA CHANGES`)
  - **ผลการทดสอบ Regression**: Vitest Backend (4/4 PASS) และ Vitest Frontend (16/16 PASS) รวมถึง TypeScript Type Check (`tsc --noEmit`) ผ่านฉลุย 100% ปราศจากข้อผิดพลาด
- **ตรวจสอบความสอดคล้องและการแยกบทบาท 3 Roles ทั้งระบบ (STEP 4.10.1.6 — Three-Role Separation & Role Consistency Audit) (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการตรวจสอบเชิงวิเคราะห์ทั้ง Repository (Verification / Audit Only โดยไม่มีการแก้ไข Source Code, Backend, Frontend, API, Database, Prisma Schema, Permission, Notification, Workflow, FIFO, UI, Test หรือ Documentation):
  - **ผลการตรวจสอบ Admin ≠ Supervisor ทั่วทั้งโปรเจกต์**:
    - **Backend API (CORRECT)**: ทุก Endpoint ใน Backend แยกสิทธิ์ถูกต้องแล้ว (`requireRole('supervisor')` สำหรับคลัง/อนุมัติ/สต็อก และ `requireRole('admin')` สำหรับ User Management)
    - **Backend Notification (ROLE CONFUSION)**: จุดเดียวที่ยังสับสนคือ `POST /transactions` กำหนด `targetRole: 'admin'` สำหรับ `pending_approval` แทนที่จะเป็น `'supervisor'`
    - **Frontend UI (UI MISMATCH)**: พบ 2 จุดที่ Frontend เผลอให้สิทธิ์ Admin ทำหน้าที่ Supervisor:
      1. [frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx) (ปุ่มอนุมัติ/ปฏิเสธ และ FIFO Lot แสดงให้ Admin)
      2. [frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx) (ปุ่มดูสต็อกแยกตาม Lot และ Lot Modal เปิดให้ Admin)
    - **E2E Tests (TEST OUTDATED)**: `roles.spec.ts` และ `flows.spec.ts` ใช้ Mock user เป็น `role: 'admin'` สำหรับทดสอบ Supervisor flow
    - **Documentation (DOCUMENTATION OUTDATED)**: `CONTEXT.md` ยังรวมหน้าที่ Manager กับ Admin ไว้ด้วยกันจากยุค 2-Tier
  - สรุปผลการตรวจสอบพบจุดที่ต้องแก้ไข (ROLE SEPARATION ISSUES FOUND) พร้อมเข้าสู่การแก้ปัญหา (READY FOR ROLE FIX)
- **ตรวจสอบสิทธิ์และบทบาทผู้ใช้งานใหม่ตามข้อกำหนดทางธุรกิจปัจจุบัน (STEP 4.10.1.5 — Role Permission Re-Verification: Admin vs Supervisor) (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการตรวจสอบเชิงวิเคราะห์ (Verification / Audit Only โดยไม่มีการแก้ไข Source Code, Database, Schema, API, UI, Permission, Workflow, FIFO Logic, Notification Logic หรือ Test Files):
  - **การยืนยัน Business Requirement ปัจจุบัน (3 บทบาทแยกจากกันโดยสิ้นเชิง ปราศจาก Role Hierarchy Assumption)**:
    - **Staff**: พนักงานทั่วไป สแกน QR ทำรายการรับ/จ่าย ไม่สามารถ Confirm/Reject และไม่สามารถจัดการ User
    - **Supervisor**: ผู้ดูแลกระบวนการคลังสินค้า มีหน้าที่และสิทธิ์แต่เพียงผู้เดียวในการ Confirm/Reject รายการ และจัดการสต็อก/สินค้า
    - **Admin**: ผู้ดูแลระบบด้านบัญชีผู้ใช้งาน (User Management) **ไม่ได้ทำหน้าที่ Supervisor และไม่ควรมีสิทธิ์ Confirm/Reject รายการคลังสินค้า**
  - **การประเมินสถานะข้อผิดพลาดใหม่ตาม Requirement ปัจจุบัน**:
    - **BUG-001 (Backend `requireRole('supervisor')`)**: สถานะ **NOT A BUG (บน Backend)** เนื่องจาก Backend ป้องกันไม่ให้ Admin เข้ามาก้าวก่ายการ Confirm/Reject ได้อย่างถูกต้องตาม Requirement แต่มีจุดที่ต้องปรับปรุง Frontend UI ให้ซ่อนปุ่มอนุมัติจาก Admin ให้สอดคล้องกัน
    - **BUG-006 (Pending Notification targetRole: 'admin')**: สถานะ **REAL BUG** เนื่องจาก Supervisor เป็นผู้มีหน้าที่ Confirm/Reject แต่กลับไม่ได้รับการแจ้งเตือนรายการรออนุมัติ (เพราะ Backend ส่งไปที่ `'admin'`)
    - **BUG-005 (Integer Quantity)**: สถานะ **NOT A BUG** ยืนยันสินค้า Packaging ต้องนับเป็นจำนวนเต็มเท่านั้น
  - บันทึกผลการประเมินและ Matrix สิทธิ์ครบถ้วน พร้อมสำหรับการเข้าสู่ขั้นตอนแก้ไข Bug (READY FOR BUG FIX)
- **ตรวจสอบเชิงลึกและพิสูจน์ยืนยัน BUG-001 และ BUG-006 ก่อนดำเนินการแก้ไข (STEP 4.10.1 — Verify BUG-001 & BUG-006 Before Fix) (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการตรวจสอบเชิงวิเคราะห์ (Verification & Audit Only โดยไม่มีการแก้ไข Source Code, Database, Schema, API, UI, Permission, Workflow, FIFO Logic หรือ Notification Logic):
  - **การพิสูจน์ BUG-001 (Admin Authorization)**:
    - ยืนยันเป็น **REAL BUG** เนื่องจาก Frontend (หน้ารายการอนุมัติ) มีปุ่ม "อนุมัติ"/"ปฏิเสธ" ให้ทั้ง Supervisor และ Admin แต่ Backend Endpoints ทั้ง 6 ตัว (`confirm`, `reject`, `with-bom`, `products`, `quantity`, `delete`) ถูกล็อกด้วย `requireRole('supervisor')` ซึ่งปฏิเสธ `admin` ด้วย HTTP 403 Forbidden
    - ปัญหานี้เป็น **Existing System Bug** จากช่วงแยกบทบาท 3-Tier Roles ไม่ใช่ FIFO Regression
  - **การพิสูจน์ BUG-006 (Pending Transaction Notification)**:
    - ยืนยันเป็น **REAL BUG** เนื่องจากเจตนารมณ์ดั้งเดิมของระบบตามโค้ดคอมเมนต์ `// สร้าง Notification แจ้งเตือน Supervisor (Role: admin)` คือการแจ้งเตือนผู้มีหน้าที่อนุมัติรายการ (Supervisor) แต่เมื่อมีการแยก Role เป็น `supervisor` ค่า `targetRole` ยังคงเป็น `'admin'` ส่งผลให้ Supervisor ไม่ได้รับการแจ้งเตือนรายการรออนุมัติ
    - ปัญหานี้เป็น **Existing System Bug** ไม่ใช่ FIFO Regression
  - **การตรวจสอบ BUG-005 (Quantity Validation)**:
    - ยืนยันเป็น **NOT A BUG** เนื่องจากสินค้ากลุ่ม Packaging ต้องนับเป็นจำนวนเต็มเท่านั้น (`Number.isInteger` เป็นการทำงานที่ถูกต้องตาม Requirement)
  - สรุปผลการตรวจสอบครบถ้วน พร้อมสำหรับการวางแผนแก้ไข Bug ในขั้นตอนถัดไป (READY FOR BUG FIX)
- **ตรวจสอบข้อผิดพลาดอัตโนมัติด้วย Vitest & Playwright (STEP 4.10 — Automated Bug Audit with Vitest & Playwright) (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการทดสอบและตรวจสอบระบบอย่างเป็นระบบ (Testing & Audit Only โดยไม่มีการแก้ไข Source Code, Database, Schema, API, UI, Workflow หรือ FIFO Logic):
  - **ผลการรัน Test Suites**:
    - **Vitest (Backend)**: ผ่าน 4/4 Tests (`api.test.ts`)
    - **Vitest (Frontend)**: ผ่าน 16/16 Tests (`auth.test.ts`, `product-bom.test.ts`, `sample.test.ts`)
    - **Playwright (E2E)**: รันทั้งหมด 17 Tests ผ่าน 8 Tests, ล้มเหลว 9 Tests (เกิดจาก Test Assertion URL / Selector Mismatch ใน `flows.spec.ts` และ `roles.spec.ts` ไม่ใช่บั๊กของระบบการทำงานจริง)
  - **การตรวจวิเคราะห์ความถูกต้องของ Business Logic**:
    - **Quantity Validation & Precision**: มีการใช้ `roundQty()` และ validation แต่พบข้อจำกัด `Number.isInteger` บน `POST /transactions` ที่ยังไม่เปิดรับทศนิยม
    - **Receive / Issue & FIFO**: ยืนยันความถูกต้อง 100% ครอบคลุม 3-Tier Priority (`receivedDate` -> `Transaction.createdAt` -> `ProductLot.id`), Atomic rollback (`prisma.$transaction`), และ Row locking (`SELECT ... FOR UPDATE`)
    - **Stock Consistency**: ยืนยัน $\text{Product.quantity} = \sum(\text{ProductLot.remainingQuantity})$ สำหรับ Packaging
    - **Role / Authorization**: พบ RBAC Gap บน Endpoint ที่ใช้ `requireRole('supervisor')` ซึ่งปฏิเสธสิทธิ์ `admin` (`role === 'admin'`) ส่งผลให้ Admin ไม่สามารถอนุมัติรายการหรือจัดการสินค้าได้
    - **Notifications**: พบข้อผิดพลาด `targetRole: 'admin'` ใน pending notification ทำให้ Supervisor ไม่ได้รับการแจ้งเตือน
  - สรุปผลการทดสอบและจัดทำ Bug Report ครบถ้วนตามมาตรฐานเพื่อเตรียมพร้อมก่อนดำเนินการในขั้นตอนถัดไป

## 4 ก.ย. 2026
- **ตรวจสอบและปรับปรุงเอกสาร Database Schema ให้ตรงกับ Prisma Schema จริง (STEP 4.8.5 — Documentation & Database Schema Correction) (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการตรวจสอบเชิงวิเคราะห์และปรับปรุงเอกสาร (Documentation Verification & Correction Only โดยไม่มีการแก้ไข Source Code, Database หรือ Prisma Schema ใดๆ):
  - **ProductLot Schema Alignment**:
    - แก้ไขชื่อฟิลด์ในเอกสารจาก `initialQuantity` -> `receivedQuantity`
    - แก้ไขสถานะจาก boolean (`isDepleted`, `isActive`) -> `status: String` (`'active'` | `'depleted'`)
    - ยืนยันฟิลด์จริงใน Prisma: `id` (Int), `productId` (Int), `lotNumber` (String UK), `supplierLot` (String?), `receivedDate` (DateTime), `receivedQuantity` (Float), `remainingQuantity` (Float), `transactionId` (Int? UK), `status` (String @default("active")), `createdAt` (DateTime), `updatedAt` (DateTime)
  - **TransactionLotAllocation Schema Alignment**:
    - แก้ไขชื่อ Foreign Key ในเอกสารจาก `lotId` -> `productLotId`
    - แก้ไข Timestamp จาก `allocatedAt` -> `createdAt`
    - ยืนยันฟิลด์จริงใน Prisma: `id` (Int), `transactionId` (Int), `productLotId` (Int), `quantity` (Float), `createdAt` (DateTime @default(now()))
  - **FIFO Scope & Workflows Confirmation**:
    - ยืนยัน FIFO ใช้งานเฉพาะสินค้า Packaging (`itemType === 'Packaging'`) เท่านั้น
    - Non-Packaging (FG, Raw Material, Bulk) ไม่ใช้ ProductLot และไม่มี Allocation
    - สต็อก Packaging: $Product.quantity = \sum(ProductLot.remainingQuantity)$ สอดคล้อง 100%
  - เอกสารและบันทึกได้รับการสอบทานและตรงกับ Source of Truth ใน Prisma Schema และระบบจริง 100%
- **พัฒนา UI แสดงรายละเอียดการตัดสต็อกตาม FIFO ในหน้ารายการ (STEP 4.3.2 — Transaction FIFO Allocation UI Implementation) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx):
    - เพิ่มส่วนแสดงรายละเอียด **"ตัดสต็อกตามลำดับ FIFO" (FIFO Allocation)** ในการ์ดรายการเบิกสินค้า (Issue) ที่ได้รับการอนุมัติแล้ว (`status === 'confirmed'`) เฉพาะสินค้ากลุ่ม **Packaging**
    - ออกแบบเป็นส่วนที่สามารถย่อ/ขยายได้ (Collapsible Accordion) พร้อมแสดงจำนวน Lot ที่ถูกตัด และยอดรวมตัดจ่ายตาม FIFO
    - แสดงรายละเอียดของแต่ละ Allocation: ลำดับที่ (#1, #2, ...), หมายเลข Lot, วันที่รับเข้าของ Lot, ปริมาณตัดออก, สถานะของ Lot, และ Supplier Lot (`-` หากไม่มีข้อมูล)
    - แสดงผลตามลำดับ Allocation ที่ Backend ส่งมาโดยตรง ห้าม Sort ใหม่บน Frontend
    - กำหนด Role-based visibility: แสดงเฉพาะบทบาท `Supervisor` และ `Admin` เท่านั้น โดยผู้ใช้ `Staff` จะไม่เห็นส่วนนี้และคง Workflow เดิม 100%
  - แก้ไขใน [frontend/lib/auth.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/lib/auth.ts):
    - ขยาย Interface `StockTransaction.product` ให้รองรับ `itemType?: string` สำหรับการตรวจสอบประเภทสินค้าได้อย่างแม่นยำ
  - ตรวจสอบ Type Check (`npx tsc --noEmit`) ผ่านฉลุย 100% ปราศจากข้อผิดพลาด
- **ปรับปรุงการจำกัดสิทธิ์การมองเห็น FIFO Lot UI ตามบทบาทผู้ใช้ (STEP 4.3.1.5 — Fix & Verify Role Visibility) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx):
    - ปรับเงื่อนไขการแสดงปุ่ม **"ดูสต็อกแยกตาม Lot"** บน Packaging Card ให้แสดงเฉพาะบทบาท `Supervisor` และ `Admin` เท่านั้น (`user?.role === 'supervisor' || user?.role === 'admin'`)
    - ปรับเงื่อนไขการแสดงปุ่ม **"ดู Lot"** ในตาราง Flat View ให้แสดงเฉพาะบทบาท `Supervisor` และ `Admin` เช่นเดียวกัน
    - เพิ่ม Role Guard ในฟังก์ชัน `openLotModal` เพื่อป้องกันไม่ให้ผู้ใช้บทบาท `Staff` สามารถเปิดดู Modal ได้
    - ยืนยันว่าผู้ใช้บทบาท `Staff` จะไม่เห็นปุ่มดู Lot, ไม่เห็น Lot Modal, และคง Workflow เดิม (`Scan -> Quantity -> Submit`) 100%
  - ตรวจสอบ Type Check (`npx tsc --noEmit`) ผ่านฉลุย 100% ปราศจากข้อผิดพลาด
- **พัฒนา UI แสดงรายละเอียดสต็อกแยกตาม Lot (STEP 4.3.1 — Inventory Lot Details UI Implementation) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx):
    - เพิ่มปุ่ม **"ดูสต็อกแยกตาม Lot"** (ไอคอน `Layers`) บนการ์ดสินค้าเฉพาะกลุ่ม **Packaging** ในหน้าจัดการสต็อก (Inventory)
    - เพิ่มปุ่มดู Lot ขนาดกะทัดรัดในมุมมองตาราง (Flat View) สำหรับสินค้า Packaging
    - เพิ่ม Modal แสดงรายละเอียด Lot ย่อย (`selectedLotProduct`):
      - แสดงข้อมูลสินค้า: ชื่อสินค้า, Item Code, คลัง/ตำแหน่ง, และสต็อกรวมจาก `Product.quantity`
      - เรียกข้อมูล Lot แบบ On-demand ผ่าน `fetchProductLots(product.id)`
      - แสดงรายการ Lot เรียงลำดับตาม 3-Tier FIFO ที่ส่งมาจาก API (`#1`, `#2`, ...) ห้ามจัดเรียงใหม่บน Frontend
      - ข้อมูลแต่ละ Lot ครบถ้วน: หมายเลข Lot (`INIT-...` หรือ `LOT-...`), วันที่รับเข้า, ปริมาณรับเข้า, ปริมาณคงเหลือ, สถานะ (🟢 Active / ⚪ Depleted), และ Supplier Lot (`-` หากไม่มีข้อมูล)
      - มี Loading State, Error Handling พร้อมปุ่มลองใหม่อีกครั้ง และ Empty State หากไม่มีข้อมูล Lot
      - รองรับ Responsive และการเลื่อนดูข้อมูล (Scrollable) ปิดได้ทั้งปุ่มกากบาท, ปุ่มปิดหน้าต่าง และการแตะพื้นหลัง
    - รักษา Design Language เดิม 100% ไม่กระทบสินค้า Non-Packaging (FG, Raw Material, Bulk) และไม่เปลี่ยนแปลง Staff Workflow
  - ตรวจสอบ Type Check (`npx tsc --noEmit`) ผ่านฉลุย 100% ปราศจากข้อผิดพลาด
- **พัฒนา Backend API และ Frontend Data Mapping สำหรับ FIFO UI (STEP 4.2.6) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts):
    - เพิ่ม Endpoint `GET /products/:productId/lots` สำหรับดึงรายการ Lot ย่อยของสินค้า Packaging แบบ On-demand
    - ตรวจสอบ `itemType === 'Packaging'` (ปฏิเสธสินค้า Non-Packaging อย่างถูกต้อง)
    - จัดเรียงลำดับ Lot ตามหลัก 3-Tier FIFO Priority (`receivedDate ASC` -> `Transaction.createdAt ASC` -> `ProductLot.id ASC`) รองรับกรณี Initial Lot (`transactionId = null`) ได้อย่างปลอดภัย
  - แก้ไขใน [frontend/lib/auth.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/lib/auth.ts):
    - เพิ่ม Interface `ProductLot` และ `TransactionLotAllocation`
    - เพิ่มฟิลด์ `lot?: ProductLot | null` และ `allocations?: TransactionLotAllocation[]` ใน Interface `StockTransaction`
    - เพิ่มฟังก์ชัน `fetchProductLots(productId: number)` สำหรับดึงรายการ Lots
  - ตรวจสอบ Type Check และ Build ผ่านฉลุย 100% ทั้ง Backend และ Frontend โดยไม่มีการแตะต้อง UI, Workflow หรือ Database Schema
- **ตรวจสอบความปลอดภัยและความถูกต้องของข้อมูล FIFO หลังการตัดจ่ายจริง (STEP 4.1.5 — FIFO Safety & Data Integrity Verification) (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการตรวจสอบเชิงวิเคราะห์ (Analysis & Verification Only โดยไม่มีการแก้ไข Database หรือ Source Code ใดๆ):
    - **Scope**: ยืนยันระบบ FIFO ทำงานเฉพาะสินค้า Packaging (24 รายการ) ส่วน FG (12 รายการ), Raw Material (7 รายการ), Bulk (1 รายการ) ไม่มี Lot ปะปน (0 Lots) และไม่ได้รับผลกระทบ
    - **Stock Consistency**: ตรวจสอบครบทั้ง 24 สินค้า Packaging: ยอดรวม `Product.quantity` เท่ากับ `SUM(ProductLot.remainingQuantity)` ตรงกัน 100% ทุกรายการ (0 Mismatches), ไม่มียอดติดลบ (0 Negative Stocks), และไม่มีปัญหา Precision ทศนิยม (0 Floating Point Errors)
    - **Initial Lots**: Initial Lots ทั้ง 24 รายการ มีสถานะ `active` สต็อกครบถ้วน และพร้อมสำหรับการตัดเบิกตามลำดับ FIFO
    - **Safety & Concurrency**: ยืนยันการป้องกัน Concurrency ผ่าน Database Row Lock (`SELECT ... FOR UPDATE`), การป้องกัน Confirm ซ้ำ (HTTP 409), และการ Rollback เมื่อเกิดข้อผิดพลาด
    - **Final Verdict**: สรุปผลการประเมินสถานะระบบเป็น **✅ READY** พร้อมสำหรับการใช้งานจริง
- **พัฒนาระบบ FIFO Issue / Allocation จริงสำหรับสินค้า Packaging (STEP 4.1) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [backend/prisma/schema.prisma](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/prisma/schema.prisma):
    - เพิ่ม Model `TransactionLotAllocation` สำหรับบันทึกประวัติการตัด Lot (`transactionId`, `productLotId`, `quantity`, `createdAt`) พร้อมเชื่อม Relations ไปยัง Model `Transaction` และ `ProductLot`
    - ซิงค์โครงสร้างสู่ Supabase สำเร็จด้วย `npx prisma db push` ปลอดภัย 100%
  - แก้ไขใน [backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts):
    - เพิ่มฟังก์ชัน `roundQty(value)` แก้ปัญหา Floating Point Precision
    - ปรับปรุง `POST /transactions/:id/confirm`:
      - ใช้ Database Row Lock (`SELECT ... FOR UPDATE`) บนตาราง `Product` เพื่อรับประกัน Concurrency ป้องกัน Race Condition เมื่อมีการ Confirm พร้อมกัน
      - คัดเลือก Active Lots ของ Packaging ตามลำดับ 3-Tier FIFO Priority (`receivedDate ASC` -> `Transaction.createdAt ASC` -> `ProductLot.id ASC`)
      - ตรวจสอบยอดสต็อกรวมของ Lot ก่อนตัด หากไม่พอจะปฏิเสธทันทีด้วย HTTP 409 (ห้าม Partial Deduction)
      - ตัดยอด `remainingQuantity` ของแต่ละ Lot ตามลำดับ พร้อมเปลี่ยนสถานะเป็น `depleted` เมื่อสต็อกหมด และสร้างบันทึกใน `TransactionLotAllocation`
      - ลด `Product.quantity` และเปลี่ยนสถานะ Transaction เป็น `confirmed` ภายใต้ `prisma.$transaction` เดียวกัน (Atomic Rollback 100%)
      - สินค้า Non-Packaging (FG/Raw Material/Bulk) ยังคงลดเฉพาะ `Product.quantity` ตามเดิม
    - ทดสอบผ่านฉลุยครบทั้ง 11 Test Cases (Cases A - K) และคงความถูกต้องของ Stock $\text{Product.quantity} = \text{SUM(ProductLot.remainingQuantity)}$ ครบ 24 รายการ Packaging (0 Mismatches)
- **ตรวจสอบความพร้อมการจัดลำดับ FIFO Lot Ordering (STEP 3.11 — FIFO Lot Ordering Verification) (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการตรวจสอบเชิงวิเคราะห์ (Analysis & Verification Only):
    - ยืนยัน 3-Tier FIFO Priority Rule: 1) `receivedDate ASC`, 2) `Transaction.createdAt ASC`, 3) `ProductLot.id ASC` (Deterministic Tie-break)
    - ตรวจสอบ Initial Lots 24 รายการของ Packaging ทั้งหมด: มี `receivedDate` ครบถ้วน, ข้อมูลถูกต้อง พร้อมเข้าร่วมการตัดจ่ายแบบ FIFO
    - ตรวจสอบความถูกต้องของเงื่อนไขการคัดกรอง: Lot ที่มี `status = 'active'` และ `remainingQuantity > 0` จะถูกดึงมาใช้ ส่วน Lot ที่ `remainingQuantity = 0` จะถูกกันออก
    - ตรวจสอบ Stock Consistency: $\text{Product.quantity} = \text{SUM(ProductLot.remainingQuantity)}$ ครบทั้ง 24 รายการ (0 Mismatches)
    - ทดสอบ Simulation การจัดลำดับทั้ง 4 Cases (A, B, C, D) ผ่านฉลุย 100%
- **พัฒนาระบบ Receive Confirm & Automatic Lot Creation สำหรับสินค้า Packaging (STEP 3.10) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts):
    - เพิ่มฟังก์ชัน `formatLotNumber(date, id)` สำหรับสร้าง `lotNumber` ในรูปแบบ `LOT-YYYYMMDD-XXXX` โดยใช้ `id` ของ Lot โดยตรง ป้องกันปัญหาเลขซ้ำเมื่อมีการ Confirm พร้อมกัน
    - ปรับปรุง `POST /transactions/:id/confirm`:
      - ตรวจสอบ `itemType === 'Packaging'` ของสินค้า หากเป็น Packaging ระบบจะสร้าง `ProductLot` ให้อัตโนมัติ (`receivedDate`, `receivedQuantity`, `remainingQuantity`, `supplierLot`, `transactionId`, `status: 'active'`)
      - อัปเดต `Product.quantity` เพิ่มขึ้นตามยอดที่รับเข้า และบันทึกสถานะ Transaction เป็น `confirmed`
      - ทุกคำสั่งทำงานอยู่ภายใต้ `prisma.$transaction` เดียวกัน รับประกันความเป็น Atomic (หากล้มเหลวจะ Rollback ทั้งหมด)
      - สำหรับสินค้าประเภท Non-Packaging (FG, Raw Material, Bulk) จะอัปเดตเฉพาะ `Product.quantity` โดยไม่สร้าง `ProductLot`
    - รองรับการรับค่า `receivedDate` และ `supplierLot` (Optional) ผ่าน `POST /transactions` โดย Staff ไม่จำเป็นต้องสร้างหรือกรอกเลข Lot เอง (ระบบสร้างให้อัตโนมัติ)
    - ทดสอบผ่านฉลุยครบทั้ง 4 Test Cases: Case A (รับเข้า Packaging สำเร็จและ Lot ตรง), Case B (ป้องกันการ Confirm ซ้ำ/Duplicate), Case C (Non-Packaging ไม่สร้าง Lot), Case D (Rollback เมื่อเกิด Error)
- **ตรวจสอบ Scope ของระบบ FIFO เฉพาะสินค้า Packaging (STEP 3.9.5 — Packaging Scope Verification) (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการตรวจสอบและวิเคราะห์โครงสร้างข้อมูลจริงของระบบ (Analysis & Verification Only โดยไม่มีการแก้ไข Database หรือ Source Code ใดๆ):
    - **Frontend & API**: หน้าเว็บจัดการสต็อก [frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx) ดึงข้อมูลผ่าน `GET /products` จากตาราง `Product` โดยใช้เงื่อนไข `itemType === 'Packaging'` ซึ่งแสดงรายการสินค้าบรรจุภัณฑ์ทั้งหมด **24 รายการ** ตรงกับหน้าเว็บและ Requirement
    - **Source of Truth**: ตาราง `Product` เป็น Master Data และ Stock ของ Packaging ส่วนตาราง `BillOfMaterial` มีหน้าที่เก็บโครงสร้างสูตรสินค้า (BOM Recipe) ไม่ได้ใช้เก็บสต็อกหรือทำ FIFO
    - **Initial Lot Verification**: ตาราง `ProductLot` ปัจจุบันมี Initial Lots ทั้งหมด **24 รายการ** ซึ่งตรงกับสินค้าประเภท Packaging 100% (ไม่มี Non-Packaging ปะปน) และยอดคงเหลือใน `ProductLot.remainingQuantity` เท่ากับ `Product.quantity` ครบทุกรายการ (0 Mismatches)
    - **Receive / Issue Flow**: ระบบตัดและเพิ่มสต็อกผ่านตาราง `Product` และ `Transaction` โดยเตรียมพร้อมเชื่อมต่อการสร้าง Lot ในขั้นตอน STEP 3.10

## 31 ส.ค. 2026
- **ดำเนินการ Initial Lot Migration สำหรับสต็อกเดิมเข้าสู่ระบบ FIFO (เฉพาะ Packaging 24 รายการ) (STEP 3.9) (เสร็จสมบูรณ์ 100%)**:
  - สร้างและปรับปรุงสคริปต์ [backend/src/migrateInitialLots.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/migrateInitialLots.ts) ให้โฟกัสเฉพาะสินค้าประเภทบรรจุภัณฑ์ (`itemType: 'Packaging'`):
    - กรองสินค้าที่เป็น Packaging ครบทั้ง 24 รายการ (มีสต็อก `quantity > 0` ทั้ง 24 รายการ)
    - เคลียร์ Initial Lots ของหมวดอื่นที่ไม่ใช่ Packaging ออกจากตาราง `ProductLot`
    - สร้าง `ProductLot` ประเภท Initial Lot (`INIT-[itemCode]`) ครบ **24 รายการพอดีเป๊ะ** กำหนด `receivedDate = 2026-08-31T00:00:00.000Z`, `supplierLot = 'INITIAL_STOCK'`, `transactionId = null`, `status = 'active'`
    - ตรวจสอบ Stock Consistency: $\text{Product.quantity} = \text{ProductLot.remainingQuantity}$ ตรงกัน 100% ทุกรายการ (0 Mismatches)
    - ทดสอบความ Idempotent รันซ้ำไม่สร้าง Lot เบิ้ล ข้อมูลสินค้าและธุรกรรมเดิมปลอดภัยครบถ้วน 100%
- **สร้างโครงสร้าง Database Schema: ProductLot สำหรับระบบ FIFO (STEP 3.8) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [backend/prisma/schema.prisma](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/prisma/schema.prisma):
    - เพิ่ม Model `ProductLot` ครบทุกฟิลด์: `id`, `productId`, `lotNumber (@unique)`, `supplierLot`, `receivedDate`, `receivedQuantity`, `remainingQuantity`, `transactionId (@unique nullable)`, `status`, `createdAt`, `updatedAt`
    - เพิ่ม Index: `@@index([productId, status])` และ `@@index([receivedDate])`
    - เพิ่ม Relation `lots ProductLot[]` ใน Model `Product` และ `lot ProductLot?` ใน Model `Transaction`
    - รัน `prisma db push` และ `prisma generate` อย่างปลอดภัย ข้อมูลเดิมใน `Product` (44 รายการ) และ `Transaction` (16 รายการ) ปลอดภัย 100% ไม่มีการสูญหายหรือถูกรีเซ็ต
    - ตรวจสอบ Type Check และ Build ผ่านฉลุย 100%
- **ปรับปุ่มเปิด-ปิดแถบเมนูให้เหลือปุ่มเดียวใน Top Bar และใช้ดีไซน์ไอคอนสามขีด (Single 3-Line Hamburger Menu Toggle) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx):
    - ปรับเหลือปุ่มควบคุมเปิด-ปิดแถบเมนูเพียงจุดเดียวที่แถบ Top Bar ด้านบนซ้าย
    - เปลี่ยนไอคอนปุ่มเป็น **รูปสามขีด (Hamburger Menu `<Menu />`)** สะอาดตา สบายตา ใช้งานง่าย
    - นำปุ่มพับเก็บในส่วนหัวของแถบ Sidebar ออก เพื่อความเรียบง่ายและเป็นระเบียบตามคำขอ
- **เพิ่มปุ่มเปิด-ปิดแถบเมนูด้านข้าง (Collapsible Sidebar with Toggle Button) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx):
    - กำหนดค่าเริ่มต้นเมื่อเข้าสู่ระบบ (`sidebarOpen = true`) ให้แถบเมนูด้านข้างกางออกพร้อมใช้งานทันที
    - **ปุ่มปิดใน Sidebar Header**: เพิ่มปุ่มไอคอน `<PanelLeftClose />` ที่มุมบนขวาของกล่องโลโก้ ให้ผู้ใช้กดพับปิดแถบเมนูด้านข้างได้ทันที
    - **ปุ่มเปิด-ปิดใน Top Bar**: เพิ่มปุ่มสลับเปิด-ปิดแถบเมนู (`<PanelLeftClose />` / `<PanelLeftOpen />`) ไว้ที่มุมบนซ้ายของแถบ Top Bar เมื่อกดปิด แถบ Sidebar จะหุบเก็บอย่างนุ่มนวล (`transition-all duration-300`) และพื้นที่เนื้อหาหน้าเว็บจะขยายเต็มความกว้างหน้าจอทันที
- **ปรับแต่งไอคอนในแถบ Top Bar ให้แสดงแบบเรียบง่าย ไม่ใส่กรอบไฮไลท์สีแดง (Clean Neutral Icon in Top Bar) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx):
    - นำกรอบพื้นหลังสีแดงอ่อน (`bg-red-50`) และเส้นขอบสีแดงออกทั้งหมด โดยเปลี่ยนมาแสดงเป็นไอคอนสีธรรมชาติ (`text-slate-500`) วางคู่กับชื่อหน้าโดยตรง ทำให้แถบด้านบนดูมินิมอล สะอาดตา และไม่แย่งความสนใจจากเนื้อหาหลัก
- **แก้ไขปัญหา Build Error (Syntax Error: Expected ',', got '{') ใน Navigation.tsx (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx):
    - สาเหตุเกิดจากการแก้ไขโค้ดรอบก่อนหน้าที่แท็กเปิด `<div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">` (กล่องครอบฝั่งขวา) หายไป ทำให้แท็ก `</div>` ด้านล่างไปปิดแท็กนอกสุดก่อนกำหนด
    - ได้ทำการใส่แท็กเปิดของกล่องคอนเทนต์ฝั่งขวากลับคืนมาอย่างถูกต้อง ทำให้โครงสร้าง JSX เปิด-ปิดครบคู่ 100% และ Next.js Compile ผ่านฉลุยทันที
- **เพิ่มไอคอนประจำเมนูไว้ด้านหน้าชื่อหน้าในแถบ Top Bar เมื่อกดเลือกเมนู (Active Menu Icon in Top Bar) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx):
    - เพิ่มไอคอนของเมนูนั้นๆ ในกรอบสี่เหลี่ยมโค้งมนสีแดงอ่อน (`bg-red-50 border border-red-100 text-[#BE1111]`) วางไว้ด้านหน้าชื่อหน้าในแถบ Slim Top Bar ด้านบน เช่น เมื่อเลือกหน้าหลักจะแสดงไอคอน Home, เมื่อเลือกสแกนจะแสดงไอคอน ScanLine, เมื่อเลือกสต็อกจะแสดงไอคอน Package เป็นต้น
- **ปรับแต่งน้ำหนักตัวอักษรแถบเมนูนำทางเป็นรูปแบบตัวธรรมดา (Non-bold / Regular Menu Text) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx):
    - ปรับเปลี่ยนคลาสข้อความและชื่อเมนูทั้งหมดใน Navigation ให้ใช้ `font-normal` (Regular weight) แทน `font-semibold` / `font-bold` ตามคำขอของผู้ใช้ เพื่อให้ข้อความแถบเมนูดูเบาสบายตา เรียบหรู และไม่หนาเกินไป
- **ปรับแต่งฟอนต์ตัวหนังสือของทั้งเว็บแอปพลิเคชันเป็นฟอนต์ "Prompt" (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/app/globals.css](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/globals.css) และ [frontend/app/layout.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/layout.tsx):
    - กำหนดฟอนต์ **Prompt** (`var(--font-prompt-sans)`) เป็นฟอนต์หลักอันดับหนึ่งของทั้งระบบ (`--font-display`, `--font-sans`, `--font-body` และ `body`)
    - รองรับทั้งภาษาไทยและภาษาอังกฤษ พร้อมน้ำหนักตัวอักษรครบถ้วน (`weight: 300, 400, 500, 600, 700, 800`) และ `display: swap` เพื่อให้ตัวหนังสือคมชัด โค้งมน ทันสมัย อ่านง่ายแบบ Loopless สไตล์เดียวกับเวอร์ชัน Deployment
- **ปรับปรุงโครงสร้างแถบเมนูนำทางเป็นแถบด้านซ้าย (Fixed Left Sidebar Navigation Layout) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx):
    - **แถบด้านซ้ายบน Desktop (`md:flex`)**: ปรับเปลี่ยนโครงสร้างระบบนำทางเป็น **Fixed Left Sidebar** แสดงโลโก้ `WPK MMS` (ไอคอนกล่องสินค้าสีแดง `#BE1111`), รายการเมนูแนวตั้งพร้อมไอคอน, Badge แสดงจำนวนรายการรออนุมัติ, และกล่องโปรไฟล์ผู้ใช้งานพร้อมปุ่มออกจากระบบที่ด้านล่างของ Sidebar
    - **ส่วนหัวด้านบนบน Desktop (Slim Top Bar)**: แสดงชื่อหน้าปัจจุบันที่กำลังเปิดอยู่ และคงปุ่มกระดิ่งแจ้งเตือน (Notifications Popover) ไว้ที่มุมบนขวาพร้อมสถานะระบบพร้อมใช้งาน
    - **หน้าจอมือถือ (Mobile View)**: คงแถบ Top Header ด้านบน และ Bottom Navigation Bar ด้านล่างไว้ตามเดิม เพื่อความสะดวกในการใช้งานด้วยนิ้วเดียวบนสมาร์ทโฟน
    - **โทนสีและดีไซน์**: ใช้สไตล์ Clean Light & Red Accent (`#BE1111`) เส้นขอบบางเฉียบ เงาเบานุ่มนวล สวยงามเข้ากับทั้งระบบ

## 28 ส.ค. 2026
- **จัดวางแถบเมนูนำทางให้เรียงชิดซ้ายต่อเนื่องต่อจากโลโก้ WPK MMS (Left-Aligned Top Navigation Layout) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx):
    - **การจัดวางฝั่งซ้าย (Left Section)**: รวมกลุ่มโลโก้ `WPK MMS` (พร้อมไอคอนกล่องสินค้าสีแดง) ต่อด้วยเส้นคั่นแนวตั้งบางๆ (`h-6 w-px bg-slate-200/80`) และกลุ่มปุ่มเมนูทั้งหมด (หน้าหลัก, สแกน, รายการ, สต็อก, รายงาน, แดชบอร์ด หรือ จัดการผู้ใช้) ให้เรียงต่อกันชิดฝั่งซ้ายอย่างสวยงามและเป็นระเบียบ
    - **การจัดวางฝั่งขวา (Right Section)**: สงวนไว้เฉพาะปุ่มกระดิ่งแจ้งเตือน (Notifications Popover), กล่องโปรไฟล์ผู้ใช้ (Avatar และชื่อ) และปุ่มออกจากระบบ (Logout)
    - **การแสดงผลบนมือถือ (Mobile View)**: คงแถบ Header ด้านบน และแถบเมนูแท็บด้านล่าง (Bottom Tabs) ไว้อย่างสมบูรณ์ตามเดิม

## 27 ส.ค. 2026
- **ปรับเมนูนำทางตามบทบาท: พนักงาน/หัวหน้างานเข้าถึงเมนูคลังสินค้าครบถ้วน ส่วน Admin มีเฉพาะหน้าหลักและจัดการผู้ใช้ (เสร็จสมบูรณ์ 100%)**:
  - **แถบเมนูนำทาง (Navigation Bar)**:
    - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx):
      - **Admin (`admin`)**: กำหนดให้มองเห็นเฉพาะ 2 เมนูหลัก ได้แก่ **"หน้าหลัก" (`/`)** และ **"จัดการผู้ใช้งาน" (`/users`)**
      - **พนักงาน (`warehouse_staff`) & หัวหน้างาน (`supervisor`)**: มองเห็นเมนูใช้งานคลังสินค้าครบทั้ง 6 เมนู ได้แก่ **หน้าหลัก**, **สแกน**, **รายการ**, **สต็อก**, **รายงาน**, และ **แดชบอร์ด**
  - **หน้าหลัก (Home Page Quick Actions)**:
    - แก้ไขใน [frontend/app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/page.tsx): ปรับการ์ด Quick Action สำหรับ Admin ให้แสดงการ์ดจัดการผู้ใช้ และสำหรับพนักงาน/Supervisor ให้แสดง 2 การ์ดหลัก คือ **"สแกนสินค้า"** (`/scan`) และ **"จัดการสต็อก"** (`/inventory`)
  - **การควบคุมสิทธิ์ตามบทบาท (Role-based Permission Controls)**:
    - แก้ไขใน [frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx): ปุ่ม "อนุมัติ" และ "ปฏิเสธ" แสดงให้เฉพาะ Supervisor และ Admin เท่านั้น พนักงานทั่วไป (`warehouse_staff`) จะแสดงสถานะ "รอการอนุมัติจาก Supervisor"
    - แก้ไขใน [frontend/app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/inventory/page.tsx): พนักงานทั่วไปสามารถเข้าดูสต็อกสินค้า ค้นหา และดูโครงสร้างสูตร BOM ได้ แต่ไม่มีปุ่มเพิ่ม/แก้ไข/ลบหรือปรับยอดสต็อก (ปุ่มเปิดให้เฉพาะ Supervisor) และหาก Admin เข้าหน้าสต็อกจะ Redirect ไปที่ `/users` ทันที

## 25 ส.ค. 2026
- **ปรับปรุงระบบการลงทะเบียนและสิทธิ์การเข้าใช้งานใหม่เป็น 3 Roles (Admin, Supervisor, Staff) พร้อมยกเลิกการสมัครสมาชิกสาธารณะ (เสร็จสมบูรณ์ 100%)**:
  - **โครงสร้าง Roles**:
    1. `admin` (System Admin / แอดมินระบบ): สิทธิ์สร้างและจัดการบัญชีผู้ใช้ทั้งหมดในระบบ (`/users`)
    2. `supervisor` (Supervisor / หัวหน้างาน): สิทธิ์อนุมัติ/ปฏิเสธรายการรับเข้า-จ่ายออกสแกนสินค้า, ดูคลังสินค้า, แดชบอร์ด และรายงาน
    3. `warehouse_staff` (Staff / พนักงานทั่วไป): สิทธิ์สแกน QR Code รับเข้า/จ่ายออกสินค้า และดูประวัติรายการตนเอง
  - **ปิดระบบสมัครสมาชิกสาธารณะ (Closed Public Registration)**:
    - แก้ไขใน [backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts): ปรับปรุง `POST /auth/register` ให้ปฏิเสธคำขอสมัครสาธารณะพร้อมส่งข้อความแจ้งเตือน 403 Forbidden
    - แก้ไขใน [frontend/app/login/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/login/page.tsx): ลบลิงก์และปุ่มลงทะเบียนใหม่ออก เปลี่ยนเป็นข้อความแนะนำให้ติดต่อ System Admin
    - แก้ไขใน [frontend/app/register/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/register/page.tsx): ปรับหน้าเป็นแจ้งเตือนว่าปิดรับสมัครสมาชิกสาธารณะแล้ว พร้อมปุ่มย้อนกลับหน้า Login
  - **เพิ่มระบบและหน้าจัดการผู้ใช้งานสำหรับ Admin (`/users`)**:
    - แก้ไขใน [backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts): เพิ่ม Endpoints ใหม่สำหรับ Admin (`POST /users` สร้างผู้ใช้ใหม่พร้อมกำหนด Role, `PATCH /users/:id/role` เปลี่ยนสิทธิ์ Role, `PATCH /users/:id/reset-password` รีเซ็ตรหัสผ่าน, `DELETE /users/:id` ลบบัญชีผู้ใช้งาน)
    - แก้ไขใน [frontend/lib/auth.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/lib/auth.ts): เพิ่ม API helper functions (`createUser`, `updateUserRole`, `resetUserPassword`, `deleteUser`)
    - แก้ไขใน [frontend/app/users/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/users/page.tsx): ออกแบบหน้า UI สไตล์ Apple Liquid Glass สำหรับ Admin ในการสร้างผู้ใช้งานใหม่, กรองรายการตามบทบาท, แก้ไข Role, รีเซ็ตรหัสผ่าน และลบบัญชี
  - **ปรับปรุงการแบ่งแยกหน้าที่อย่างชัดเจน (Strict Separation of Duties: Admin vs Supervisor)**:
    - **Admin (ผู้ดูแลระบบบัญชีผู้ใช้)**: ดูแลเฉพาะระบบผู้ใช้งาน 100% (สร้างบัญชี, แก้ไขข้อมูลชื่อ/รหัสพนักงาน, เปิด/ปิดระงับบัญชี, เปลี่ยน Role, รีเซ็ตรหัสผ่าน, ดูรายชื่อทั้งหมด, ลบบัญชี) โดยไม่มีสิทธิ์ยุ่งเกี่ยวกับสินค้าหรือสต็อก
    - **Supervisor (หัวหน้างานคลังสินค้า)**: ดูแลระบบคลังสินค้าทั้งหมด (เพิ่มสินค้า, สร้างสูตร BOM, แก้ไข/ปรับปรุงสต็อก, ลบสินค้า, อนุมัติ/ปฏิเสธรายการรับ-จ่าย, ดูรายงาน และแดชบอร์ด)
    - **Staff (พนักงานคลังสินค้า)**: สแกน QR Code รับเข้า/จ่ายออก และดูประวัติรายการตนเอง
  - **อัปเดตฟังก์ชันครบถ้วนในหน้าจัดการผู้ใช้ ([frontend/app/users/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/users/page.tsx))**:
    - เพิ่ม Modal แก้ไขข้อมูลผู้ใช้ (ชื่อ-นามสกุล, รหัสพนักงาน) ผ่าน `PATCH /users/:id`
    - เพิ่มปุ่มเปิด/ปิด (ระงับ) การใช้งานบัญชี (Toggle Active/Disabled) ผ่าน `PATCH /users/:id/status`
    - เพิ่มระบบบล็อกการเข้าสู่ระบบหากบัญชีอยู่ในสถานะ `disabled`
    - ล็อกหน้าเมนูและหน้าคลังสินค้า (`/inventory`) ให้เฉพาะ Supervisor เข้าถึง หาก Admin เข้าถึงจะ Redirect ไปยังหน้าจัดการผู้ใช้งานทันที
    - เพิ่มเมนู **"หน้าหลัก" (`/`)** บนแถบเมนูนำทาง (Navigation Bar) สำหรับ Admin ให้สามารถสลับระหว่างหน้าหลักและหน้าจัดการผู้ใช้งานได้อย่างสะดวก
    - ปรับปรุงดีไซน์หน้าหลัก (`/`) ของ Admin ให้แสดงการ์ด 2 คอลัมน์แนวตั้งทรงเดียวกับการ์ดจัดการสต็อก ได้แก่ การ์ด **"จัดการผู้ใช้งาน"** (ปุ่มสร้างผู้ใช้ใหม่ สีแดง) และการ์ด **"รายชื่อผู้ใช้งาน"** (ปุ่มดูรายชื่อทั้งหมด สีน้ำเงินเข้ม) พร้อมตรวจสอบการทำงานจริงผ่าน Browser เรียบร้อยแล้ว
    - ปรับปรุงการแยกหมวดหมู่ในหน้าจัดการผู้ใช้ ([frontend/app/users/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/users/page.tsx)) ให้เป็นดีไซน์ **Dropdown Menu** สไตล์ Apple Liquid Glass รองรับทั้งการกรองตาม **บทบาท (Role)** และ **สถานะบัญชี (Status)** พร้อมจำนวนนับผู้ใช้งานในแต่ละหมวดและแอนิเมชันเปิด/ปิดอย่างสวยงามราบรื่น
    - ปรับดีไซน์ Dropdown ในหน้าจัดการผู้ใช้ให้ดูสะอาดตา เรียบง่าย (Clean & Minimal): นำไอคอน/อีโมจิด้านหน้าออกทั้งหมด และปรับขนาดน้ำหนักตัวอักษรเป็นรูปแบบตัวธรรมดา (Regular / Non-bold Font Weight) ตามความต้องการของผู้ใช้เรียบร้อยแล้ว
    - ปรับปรุงการแสดงผลในคอลัมน์ **สถานะ** ของตารางผู้ใช้งาน ให้แสดงผลเป็น **จุดสีเขียว (Green Dot)** พร้อมข้อความ "ใช้งานอยู่" ในรูปแบบตัวหนังสือธรรมดา (Non-bold) และไม่ตัดคำแนวตั้ง (whitespace-nowrap) เรียบร้อยแล้ว
    - เพิ่มการแสดงผลบทบาทผู้ใช้งานในส่วน **บทบาทผู้ใช้งาน (User Roles)** บนหน้าหลัก (`/`) ให้ครบถ้วนทั้ง **3 Roles (Staff, Supervisor, System Admin)** ในรูปแบบ 3 คอลัมน์ที่สวยงาม พร้อมระบุสิทธิ์และหน้าที่ของแต่ละบทบาทอย่างละเอียดและชัดเจน เรียบร้อยแล้ว
    - ปรับแต่งข้อความและสไตล์ของการ์ดบทบาทผู้ใช้งานทั้ง 3 ให้ข้อความแต่ละบรรทัดเรียงอยู่ภายใน **บรรทัดเดียว (Single Line / No Wrap)** ไม่ตัดตกบรรทัด ดูเป็นระเบียบ เรียบร้อย และอ่านง่าย เรียบร้อยแล้ว
    - ปรับปรุงการแสดงผลหัวข้อในการ์ดบนสุดของหน้าจัดการผู้ใช้ ([frontend/app/users/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/users/page.tsx)) ในหน้าจอโทรศัพท์มือถือ (Mobile View) ให้ข้อความหัวข้อ `"จัดการผู้ใช้งานระบบ (User Management)"` เรียงอยู่ภายใน **บรรทัดเดียวกัน (Single Line)** โดยไม่ตัดตกบรรทัด พร้อมปรับขนาด Padding และไอคอนให้สมดุลและสวยงามเรียบร้อยแล้ว
    - ปรับปรุงการจัดวาง Dropdown ตัวกรอง **หมวดบทบาท (Role)** และ **สถานะ (Status)** ในหน้าจัดการผู้ใช้ ([frontend/app/users/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/users/page.tsx)) ให้แสดงผลอยู่เคียงข้างกันใน **บรรทัดเดียวกัน (2 คอลัมน์)** บนหน้าจอมือถือ พร้อมปรับให้ Dropdown เมนูแสดงผลอย่างพอดีกับหน้าจอและทดสอบผ่าน Browser เรียบร้อยแล้ว

## 19 ส.ค. 2026
- **ยกเลิกฟังก์ชันการอนุมัติ/ปฏิเสธผู้ใช้งานใหม่ในการลงทะเบียน (Remove User Registration Approval Workflow) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [backend/prisma/schema.prisma](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/prisma/schema.prisma): ปรับสถานะเริ่มต้นของผู้ใช้ใหม่ใน Prisma Schema เป็น `status @default("approved")`
  - แก้ไขใน [backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts): ปรับปรุง Endpoint `/auth/register` ให้สร้างบัญชีผู้ใช้ใหม่โดยมีสถานะเป็น `approved` ทันที ยกเลิกการสร้าง Notification แจ้งเตือนรออนุมัติไปยัง Admin/Supervisor และปลดล็อกเงื่อนไขการเช็กสถานะ `pending`/`rejected` ใน `/auth/login`
  - แก้ไขใน [frontend/app/register/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/register/page.tsx) และ [frontend/app/login/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/login/page.tsx): เมื่อลงทะเบียนสำเร็จ ระบบจะนำผู้ใช้ไปยังหน้า Login พร้อมแจ้งเตือนว่าสามารถกรอกรหัสผ่านเพื่อเข้าสู่ระบบได้ทันที
  - ลบประวัติข้อมูลการแจ้งเตือนประเภท `user_pending_approval` (แจ้งเตือนผู้ใช้งานใหม่รอการอนุมัติ) ออกจากตาราง `Notification` ใน Supabase เรียบร้อยแล้ว (คงไว้เฉพาะข้อมูลการแจ้งเตือนอนุมัติรับเข้า-เบิกออกสินค้าของสต็อก)
- **อัปเดตสถานะผู้ใช้งานเดิมที่มีทั้งหมดในฐานข้อมูลเป็น "อนุมัติแล้ว" (Approved Existing Users) (เสร็จสมบูรณ์ 100%)**:
  - สร้างและรันสคริปต์ [backend/src/approve_existing_users.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/approve_existing_users.ts) เพื่ออัปเดตผู้ใช้งานเดิมที่มีอยู่ในฐานข้อมูลทั้งหมด (จำนวน 11 บัญชี) จากสถานะ `pending` ให้กลายเป็น `approved`
  - ยูสเซอร์เดิมทั้งหมด (เช่น `Pailui Sirithorn`, `yeanyeen`, `สมชาย`, `ใจเย็น` ฯลฯ) สามารถเข้าสู่ระบบใช้งานได้ทันทีโดยไม่ต้องรอให้ Supervisor กดอนุมัติซ้ำ

## 17 ส.ค. 2026
- **ปรับปรุงระบบลิงก์การแจ้งเตือนและการสลับหน้าพร้อมไฮไลท์รายการในหน้ารายการ (Notification Redirection & Item Highlighting) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/backend/src/index.ts):
    - ปรับการสร้างข้อมูล Notification ให้ระบุลิงก์แบบเฉพาะเจาะจง `link: '/transactions?id=' + transaction.id` ทั้ง 3 กรณี (`pending_approval`, `confirm`, `reject`)
  - แก้ไขใน [frontend/app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/transactions/page.tsx):
    - รับค่า query parameter `id` ด้วย `useSearchParams()` (ห่อด้วย `<Suspense>` ตามมาตรฐาน Next.js App Router)
    - หากมีการกดเข้ามาจากการแจ้งเตือน (`?id=123`) ระบบจะสลับแท็บการกรองไปที่ **"ทั้งหมด" (`all`)** โดยอัตโนมัติ เพื่อรับประกันว่ารายการจะแสดงผลบนหน้าจอไม่ว่าจะมีสถานะเป็นรออนุมัติ, อนุมัติแล้ว หรือถูกปฏิเสธแล้ว
    - ทำการสโครล (`scrollIntoView`) เลื่อนหน้าจอไปยังการ์ดรายการนั้นโดยตรงอย่างเรียบง่าย
    - ใช้ `window.history.replaceState` เคลียร์ query parameter `?id=...` ออกจาก URL บาร์ทันทีหลังประมวลผล เพื่อให้เมื่อผู้ใช้กดรีเฟรช (F5) ครั้งถัดไป หน้าเว็บจะกลับไปสู่โหมดดั้งเดิม (แสดงแท็บ "รออนุมัติ") ตามปกติ

## 14 ส.ค. 2026
- **เพิ่มฟังก์ชันการปิดป๊อปอัปแจ้งเตือนเมื่อคลิก/แตะส่วนใดก็ได้บนหน้าจอ (Click/Touch Outside to Close Notification) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx):
    - เพิ่ม `useRef` (`notifDesktopRef`, `notifMobileRef`) และ Event Listener จับเหตุการณ์ `mousedown` / `touchstart` บนหน้าจอ
    - เมื่อผู้ใช้แตะหรือคลิกบริเวณใดก็ได้บนหน้าจอนอกกล่องแจ้งเตือน (Outside Click/Touch) ระบบจะสั่งปิดกล่องแจ้งเตือนทันที อำนวยความสะดวกให้ผู้ใช้งานบนมือถือและคอมพิวเตอร์ไม่ต้องเอื้อมมือไปกดซ้ำที่ปุ่มไอคอนระฆัง
- **แก้ไขการจัดวาง Popover แจ้งเตือนบนโทรศัพท์มือถือไม่ให้หลุดขอบซ้าย (Mobile Notification Popover Layout Fix) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/Navigation.tsx):
    - ปรับตำแหน่ง Popover ป๊อปอัปแจ้งเตือนบนจอมือถือ (`fixed top-16 left-3 right-3`) ให้วางกึ่งกลางกว้างพอดีขอบจอมือถือโดยเว้นระยะข้างละ 12px ป้องกันไม่ให้ฝั่งซ้ายของป๊อปอัปแจ้งเตือนหลุดขอบซ้ายของหน้าจอโทรศัพท์
    - คงการจัดวางตำแหน่งป๊อปอัปบนหน้าจอคอมพิวเตอร์ (`sm:absolute sm:right-0 sm:w-96`) ไว้ตำแหน่งเดิมทางขวามือใต้อิโมจิระฆังเหมือนเดิม 100%
- **ปรับการจัดวางการ์ดบทบาทผู้ใช้งาน (User Roles) ให้ขึ้น 2 กรอบในบรรทัดเดียวกันบนมือถือ (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - ปรับแต่งการจัดวางส่วน **บทบาทผู้ใช้งาน (User Role)** จากเดิมที่แสดงผล 1 คอลัมน์บนมือถือ ให้เรียงคู่กันแบบ **2 คอลัมน์ขนานในบรรทัดเดียวกัน (`grid grid-cols-2`)** ทั้งบนมือถือและคอมพิวเตอร์
    - ปรับสเกลขนาดไอคอน `w-8 h-8`, ฟอนต์หัวข้อ `text-xs sm:text-base`, และรายการสิทธิ์การใช้งานให้สมดุลพอดี ไม่หลุดหรือโดนตัดขอบขวาบนจอมือถือทุกรุ่น
- **ปรับแต่งการจัดวางการ์ดหน้าหลักบนมือถือให้ขึ้น 2 กรอบในบรรทัดเดียวกัน (2-Column Mobile Grid) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/page.tsx):
    - ปรับแต่ง `grid grid-cols-2` ให้การ์ด "สแกนสินค้า" และ "จัดการสต็อก" วางเรียงคู่กันแบบ 2 คอลัมน์ขนานในบรรทัดเดียวกันทั้งบนหน้าจอมือถือและเดสก์ท็อป
    - ปรับสเกล Padding (`p-3.5 sm:p-6`), ขนาดวงกลมไอคอน (`w-12 h-12 sm:w-16 sm:h-16`), ขนาดฟอนต์หัวข้อ (`text-base sm:text-xl`), คำอธิบายย่อย และปุ่มกดให้สมดุลกะทัดรัดลงตัวบนหน้าจอโทรศัพท์ทุกรุ่น
- **ปรับการ์ดแอ็กชันบนหน้าหลักให้ใช้ดีไซน์กรอบทรงแนวตั้งแบบเดียวกับบนคอมพิวเตอร์ตามเดิม (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/page.tsx):
    - คืนค่าโครงสร้างดีไซน์การ์ด Quick Action ("สแกนสินค้า" และ "จัดการสต็อก") ให้ใช้กรอบทรงแนวตั้ง โลโก้สเกลใหญ่ตรงกลาง ปุ่มกดด้านล่างดีไซน์ดั้งเดิมสวยงามเหมือนกับบนคอมพิวเตอร์ทั้งบนมือถือและเดสก์ท็อปตามคำขอของผู้ใช้
- **ยกระดับและปรับปรุง Layout ดีไซน์สำหรับการใช้งานบนโทรศัพท์มือถือ (Mobile Responsive Optimization) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/page.tsx):
    - **การ์ด Quick Action ("สแกนสินค้า" และ "จัดการสต็อก")**: ปรับเป็นแบบ Compact แนวนอนบนจอมือถือ (`md:hidden`) ไอคอน+ข้อความอยู่ฝั่งซ้าย ปุ่มแอ็กชันอยู่ฝั่งขวา ประหยัดพื้นที่แนวตั้ง และเปิดแอปมาเห็นได้ทันทีโดยไม่ต้องเลื่อนหน้าจอลงลึก
    - **ดีไซน์บนคอมพิวเตอร์ (≥ 768px)**: คงโครงสร้างการ์ดแบบแนวตั้ง ปุ่มใหญ่สไตล์ดั้งเดิมไว้เหมือนเดิม 100% (`hidden md:flex`)
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - ปรับปรุงความสูงกรอบแสดงผล Carousel บนมือถือ (`viewportHeight = 360px`) เพิ่มความสมดุลกับการทัชสไลด์ภาพตัวอย่างบนโทรศัพท์
- **เปลี่ยนชื่อไฟล์เอกสาร PDF เป็น "คู่มือแบบย่อ (Quick Guide).pdf" (เสร็จสมบูรณ์ 100%)**:
  - เปลี่ยนชื่อไฟล์ใน [`frontend/public/docs/`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/public/docs) ให้เป็น [`คู่มือแบบย่อ (Quick Guide).pdf`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/public/docs/คู่มือแบบย่อ%20(Quick%20Guide).pdf)
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - อัปเดต Path การดาวน์โหลด/เปิดไฟล์ และ attribute `download="คู่มือแบบย่อ (Quick Guide).pdf"` เพื่อให้เวลาเปิดหรือดาวน์โหลดจะได้ชื่อไฟล์ภาษาไทยอย่างถูกต้อง
- **ผูกไฟล์เอกสาร Quick Guide (PDF) เข้ากับปุ่ม "คู่มือแบบย่อ (Quick Guide)" (เสร็จสมบูรณ์ 100%)**:
  - บันทึกไฟล์เอกสาร PDF โปสเตอร์คู่มือการใช้งานแบบย่อ (`media_1786678545558.pdf`) ลงในไดเรกทอรี [`frontend/public/docs/quick-guide.pdf`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/public/docs/quick-guide.pdf)
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - ปรับเปลี่ยนแอ็กชันของปุ่ม **"คู่มือแบบย่อ (Quick Guide)"** ให้เปิดไฟล์ [`/docs/quick-guide.pdf`](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/public/docs/quick-guide.pdf) ในแท็บใหม่เมื่อผู้ใช้คลิก
- **ปรับสมดุลขนาดฟอนต์และการจัดวางสำหรับการ์ด 2 คอลัมน์ ไม่ให้ตัดหรือตกบรรทัด (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - ปรับขนาดฟอนต์ลงมาในระดับที่พอดีสำหรับการวางการ์ดคู่กัน 2 คอลัมน์ (`text-xs sm:text-[13px] md:text-xs lg:text-[13px] xl:text-sm`) พร้อมใส่ `tracking-tight`
    - ปรับขนาด Inner Padding เป็น `p-3.5 sm:p-4` เพื่อเพิ่มพื้นที่แสดงผลข้อความความยาว 43 ตัวอักษร
    - ทำให้หัวข้อ *"คู่มือแบบรายละเอียด (Work Instruction - WI)"* และคำอธิบายย่อย *"ข้อกำหนดและขั้นตอนปฏิบัติงานอย่างเป็นทางการ (WI)"* อยู่ในบรรทัดเดียวกันอย่างสมบูรณ์แบบโดยไม่โดนซ่อนหรือตกบรรทัด
- **ปรับสเกลขนาดฟอนต์และระยะห่างของการ์ดคู่มือให้อยู่บรรทัดเดียวพอดีทุกขนาดหน้าจอ (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - ปรับขนาดตัวอักษรเป็น `text-xs sm:text-[13px] md:text-xs lg:text-sm xl:text-base` พร้อมใส่ `tracking-tight` (กระชับระยะห่างตัวอักษร)
    - ปรับขนาดกล่องไอคอนและระยะ Inner Padding (`p-3.5 sm:p-4 lg:p-5`) ให้กระทัดรัดพอดี 
    - รับประกันว่าข้อความ *"คู่มือแบบรายละเอียด (Work Instruction - WI)"* และคำอธิบายย่อยจะแสดงผลในบรรทัดเดียวกันอย่างสวยงาม ไร้การตัดตกบรรทัดบนทุกขนาดหน้าจอ
- **จัดรูปแบบตัวอักษรให้การ์ดคู่มืออยู่บรรทัดเดียวกัน ไม่ตกบรรทัด (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - กำหนด `whitespace-nowrap` และปรับขนาดฟอนต์ยืดหยุ่นตามหน้าจอ (`text-xs sm:text-sm lg:text-base`) 
    - **บรรทัดที่ 1 (ชื่อการ์ด)**: แสดงข้อความเต็มในบรรทัดเดียว ไม่มีการตัดตกบรรทัด เช่น *"คู่มือแบบรายละเอียด (Work Instruction - WI)"*
    - **บรรทัดที่ 2 (คำอธิบายย่อย)**: แสดงข้อความเต็มในบรรทัดเดียว ไม่มีการตัดตกบรรทัด เช่น *"ข้อกำหนดและขั้นตอนปฏิบัติงานอย่างเป็นทางการ (WI)"*
- **ปรับแต่งดีไซน์ 2 ปุ่มคู่มือการใช้งานเป็นสไตล์การ์ดกรอบขาวแบบเดียวกับส่วนบทบาทผู้ใช้งาน (User Roles) (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - ปรับเปลี่ยนดีไซน์จากปุ่มทึบเดิม เป็น **การ์ดปุ่มกดแบบมีเส้นกรอบ (Role Card Style)** สนวนสีขาว (`bg-white`, `border`, `rounded-2xl`, `shadow-xs hover:shadow-md`) วางเรียงคู่กันขนานกับส่วนบทบาทผู้ใช้งาน
    - **การ์ดที่ 1 (คู่มือแบบย่อ - Quick Guide)**: กรอบสีแดงอ่อน (`border-red-100`) พร้อมไอคอนเล่มหนังสือ `<BookOpen />` ในกล่องสีแดง และลูกศรนุ่มนวล `<ChevronRight />`
    - **การ์ดที่ 2 (คู่มือแบบรายละเอียด - Work Instruction - WI)**: กรอบสีเทาอ่อน (`border-slate-200/70`) พร้อมไอคอนเอกสาร `<FileText />` ในกล่องสีเทา และลูกศรนุ่มนวล `<ChevronRight />`
- **ถอดการ์ดแอ็กชัน 2 รายการล่าสุดออกจากหน้าหลัก (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/page.tsx):
    - ถอดการ์ด "คู่มือแบบย่อ" และ "คู่มือแบบรายละเอียด" ออก คงเหลือไว้เฉพาะ 2 การ์ดหลักเดิม ("สแกนสินค้า" และ "จัดการสต็อก") ตามคำขอของผู้ใช้เรียบร้อย
  - แก้ไขใน [frontend/app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/page.tsx):
    - เพิ่มกรอบการ์ดใหม่ 2 รายการในส่วน Quick Action Grid โดยใช้สไตล์ดีไซน์เดียวกันกับการ์ด "สแกนสินค้า" และ "จัดการสต็อก"
    - **การ์ดที่ 3: คู่มือแบบย่อ (Quick Guide)**: โทนสีแดงแบรนด์ (`#BE1111`) พร้อมไอคอน `<BookOpen />` และปุ่ม "ดูคู่มือแบบย่อ" เมื่อกดจะทำ Smooth Scroll เลื่อนลงมายังส่วน Quick Guide บนหน้าหลัก
    - **การ์ดที่ 4: คู่มือแบบรายละเอียด (Work Instruction)**: โทนสีเข้ม (`#0F172A`) พร้อมไอคอน `<FileText />` และปุ่ม "ดูคู่มือแบบรายละเอียด" สำหรับเปิดเอกสารข้อกำหนดการปฏิบัติงาน (WI)
- **ถอดป้าย Badge ข้อความ "QUICK GUIDE" บนหัวข้อหลักออก (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - ลบป้าย Badge ข้อความ "QUICK GUIDE" ด้านบนหัวข้อ "ขั้นตอนการใช้งานระบบ" ออกทั้งหมดตามคำขอของผู้ใช้เรียบร้อย
- **ถอดปุ่มลอย "เปิด Quick Guide" ออกจากหน้าหลัก (เสร็จสมบูรณ์ 100%)**:
  - ถอนการนำเข้าและถอนการแสดงผล `QuickGuideFloatingButton` ออกจาก [frontend/app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/page.tsx)
  - ลบไฟล์ Component `frontend/components/QuickGuideFloatingButton.tsx` ออกตามคำขอของผู้ใช้เรียบร้อย
  - พัฒนา Component ใหม่ [frontend/components/QuickGuideFloatingButton.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideFloatingButton.tsx):
    - ออกแบบปุ่มลอยสไตล์ Floating Action Button (FAB) โทนสีแดงแบรนด์ (`#BE1111`) พร้อมไอคอน `<BookOpen />` และดาวส่องประกาย `<Sparkles />` จัดวางไว้ที่มุมขวาล่าง (`fixed bottom-6 right-6 z-50`)
    - เมื่อผู้ใช้กดปุ่ม ระบบจะทำ Smooth Scrolling นำทางเลื่อนลงไปยังส่วน Quick Guide (`#quick-guide`) ในหน้าหลักทันทีอย่างราบรื่น
  - อัปเดตใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx): เพิ่ม `id="quick-guide"` ให้กับส่วน Carousel
  - อัปเดตใน [frontend/app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/app/page.tsx): นำเข้าและแสดงผล `QuickGuideFloatingButton` บนหน้าหลัก
- **แก้ไขข้อความคำอธิบายในขั้นตอนที่ 3 (03 SCAN) ใน Quick Guide (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - เปลี่ยนข้อความ `shortDescription` ของขั้นตอนที่ 3 (SCAN) จากเดิม *"สแกน QR Code และระบุจำนวนสินค้าเพื่อทำรายการ"* เป็น **"เลือกประเภททำรายการ สแกน QR Code และระบุจำนวนสินค้าเพื่อทำรายการ"** ตามความต้องการเรียบร้อย
- **เพิ่มกล่องคำอธิบายบรรยายใต้ Carousel ในส่วน Quick Guide (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - เพิ่มกล่องคำอธิบาย (`Active Step Description Box`) วางตำแหน่งไว้ใต้ Carousel ด้านบนของจุด Indicator Dots
    - ใส่แอนิเมชันเปลี่ยนข้อความนุ่มนวลด้วย `AnimatePresence` (`opacity` + `y` movement) ข้อความและเลขขั้นตอนจะเปลี่ยนตามสไลด์ที่กำลังโฟกัสอยู่โดยอัตโนมัติ
    - ช่วยให้รูปภาพการ์ดไม่ถูกบดบัง และผู้ใช้สามารถอ่านรายละเอียดการใช้งานในแต่ละขั้นตอนได้อย่างชัดเจน
- **ปรับแต่งส่วน Quick Guide ให้เปิดมาที่สไลด์หน้าแรก (01 LOGIN) และเพิ่มระบบเลื่อนสไลด์อัตโนมัติ (เสร็จสมบูรณ์ 100%)**:
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - ปรับเปลี่ยนค่าเริ่มต้น `activeIndex` จาก `2` เป็น `0` เพื่อให้เมื่อเปิดหน้าหลัก Quick Guide จะแสดงผลเริ่มต้นที่ **ขั้นตอนที่ 1 (01 LOGIN)** ทันที
    - เพิ่มระบบเลื่อนสไลด์อัตโนมัติทุกๆ 4 วินาที (Auto-slide interval: 4000ms)
    - เพิ่มระบบหยุดเลื่อนสไลด์ชั่วคราวเมื่อผู้ใช้นำเมาส์ไปชี้หรือแตะสัมผัสการ์ด (Pause on Hover / Touch) และเล่นต่อเมื่อเลื่อนเมาส์ออก
    - เพิ่มระบบรีเซ็ตนับเวลา 4 วินาทีใหม่ทันที เมื่อผู้ใช้กดปุ่มเปลี่ยนสไลด์เอง (ลูกศร ← → หรือจุด Dot ด้านล่าง) เพื่อให้ผู้ใช้ดูสไลด์ที่กดเลือกได้เต็มเวลา
- **อัปเดตรูปภาพ Screenshot ในหน้า 06 REPORTS (รายงานธุรกรรม) ใน Quick Guide (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการคัดลอกไฟล์รูปภาพล่าสุดที่คุณแพรลูกอัปโหลดไปไว้ที่ [frontend/public/images/guide-reports.jpg](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/public/images/guide-reports.jpg)
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - อัปเดต Path รูปภาพขั้นตอนที่ 6 (REPORTS) ให้เรียกใช้ `/images/guide-reports.jpg`
    - เพิ่มเส้นกรอบสีเทาอ่อน (`border-slate-200/80`) พร้อมมุมโค้งมนและเงาบางๆ ให้กับรูปภาพในขั้นตอนที่ 6 (REPORTS) เช่นเดียวกับภาพ Screenshot จากโทรศัพท์มือถือในขั้นตอนอื่นๆ

## 13 ส.ค. 2026
- **ปรับปรุงความคมชัดของรูปภาพ Screenshot หน้า 02 HOME (หน้าหลัก) ใน Quick Guide (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการนำไฟล์รูปภาพ Screenshot ต้นฉบับความละเอียดสูงทั้ง 2 ครึ่งของหน้า Home มาต่อกันแบบคู่ขนาน (Side-by-side) ด้วย Python PIL (LANCZOS Resampling Quality 98%) 
  - บันทึกทับไฟล์ [frontend/public/images/guide-home.png](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/public/images/guide-home.png) ทำให้รูปภาพในขั้นตอนที่ 2 (HOME) คมชัดระดับ High Definition เทียบเท่ากับขั้นตอนที่ 5 (STOCK)
- **อัปเดตรูปภาพ Screenshot ในหน้า 05 STOCK / INVENTORY (สต็อกสินค้า) ใน Quick Guide (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการนำรูปภาพ 2 รูปที่คุณแพรลูกแนบมา (หน้าหมวดหมู่สต็อก + หน้ารายละเอียดสินค้าพร้อม QR Code) มาต่อกันแบบคู่ขนาน (Side-by-side) ด้วย Python PIL แล้วบันทึกไว้ที่ [frontend/public/images/guide-inventory.jpg](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/public/images/guide-inventory.jpg)
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx): อัปเดต Path รูปภาพขั้นตอนที่ 5 (STOCK / INVENTORY) ให้เรียกใช้ `/images/guide-inventory.jpg`
- **อัปเดตรูปภาพ Screenshot และเส้นกรอบสีเทาในหน้า 04 PENDING TRANSACTIONS (รายการรอการยืนยัน) ใน Quick Guide (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการคัดลอกไฟล์รูปภาพล่าสุดที่คุณแพรลูกอัปโหลดไปไว้ที่ [frontend/public/images/guide-pending.jpg](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/public/images/guide-pending.jpg)
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx): 
    - อัปเดต Path รูปภาพขั้นตอนที่ 4 (PENDING TRANSACTIONS) ให้เรียกใช้ `/images/guide-pending.jpg`
    - เพิ่มเส้นกรอบสีเทาอ่อน (`border-slate-200/80`) พร้อมมุมโค้งมนและเงาบางๆ ให้กับรูปภาพในขั้นตอนที่ 4
- **อัปเดตรูปภาพ Screenshot และเส้นกรอบสีเทาในหน้า 03 SCAN (รับเข้า - เบิกออก) ใน Quick Guide (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการคัดลอกไฟล์รูปภาพล่าสุดที่คุณแพรลูกอัปโหลดไปไว้ที่ [frontend/public/images/guide-scan.jpg](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/public/images/guide-scan.jpg)
  - แก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx): 
    - อัปเดต Path รูปภาพขั้นตอนที่ 3 (SCAN) ให้เรียกใช้ `/images/guide-scan.jpg`
    - เพิ่มเส้นกรอบสีเทาอ่อน (`border-slate-200/80`) พร้อมมุมโค้งมนและเงาบางๆ ให้กับรูปภาพในขั้นตอนที่ 3 (SCAN) เช่นเดียวกับขั้นตอนที่ 1 (Login)
- **ย้อนกลับไปใช้ดีไซน์ดั้งเดิม พร้อมปรับขนาดและ Opacity การ์ดที่ไม่โดนโฟกัสให้เล็กลงอย่างชัดเจน (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการแก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - ปรับลดขนาดการ์ดด้านข้าง (Side Cards / Unfocused Cards) ให้เล็กลงจากเดิม (Desktop: 200x300 px, Tablet: 175x260 px, Mobile: 140x220 px)
    - เพิ่มเอฟเฟกต์จางการ์ดด้านข้างด้วย `opacity: 0.5` ทำให้การ์ดตรงกลางที่กำลังโฟกัสอยู่ (`320x420 px`, `opacity: 1`) โดดเด่น คมชัด และสร้างมิติความลึกได้อย่างชัดเจนยิ่งขึ้น
- **ปรับปรุงดีไซน์และสัดส่วน Carousel ในหน้า Quick Guide (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการแก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/components/QuickGuideCarousel.tsx):
    - ปรับใช้กรอบอ้างอิงตาม Breakpoint ใหม่ที่ผู้ใช้กำหนดอย่างเคร่งครัด
      - **Desktop (≥ 1280px):** Viewport 1280x420, Active Card 320x420, Side Card 240x360
      - **Tablet (768px - 1279px):** Viewport 960x360, Active Card 280x380, Side Card 200x300
      - **Mobile (≤ 767px):** Viewport 100%x340, Active Card 220x320, Side Card 160x240
    - ปรับระยะห่างระหว่างการ์ด (Gap) เป็น 24px และใช้สมการคำนวณระยะแกน X (xOffset) ตาม Breakpoint
    - ปรับปุ่มเปลี่ยนทิศทางซ้าย-ขวาให้มีขนาด 48x48 px และจัดให้อยู่กึ่งกลางแนวตั้งภายในกรอบเทา
    - ปรับ Card ด้านในให้เป็นสีขาว (White) มุมโค้งมน (rounded-2xl) พร้อมเงา `0px 12px 30px rgba(0,0,0,0.08)` และตัวหนังสือสีแดง/ดำด้านบน พร้อมภาพ Screenshot ด้านล่าง (ไม่มีกรอบหน้าต่างแอป) ตาม Mockup ล่าสุด
    - แก้ไขข้อความ Badge ด้านบนสุดของ Section จาก "SYSTEM WORKFLOW" เป็น "QUICK GUIDE" และปรับฟอนต์ของคำอธิบายย่อยให้เป็น `font-display` แบบเดียวกับเมนูบาร์
- **ปรับปรุงดีไซน์ Section "ขั้นตอนการใช้งานระบบ" (QuickGuideCarousel.tsx) ให้ได้สเปกพิกเซลเป๊ะตามแบบที่ 1 (เสร็จสมบูรณ์ 100%)**:
  - ดำเนินการแก้ไขใน [frontend/components/QuickGuideCarousel.tsx](file:///D:/PailuiSirithorn/Pailui/Documents/รวมปี 4/ปี 4 เทอม 1/ฝึกงาน/QR Code Webapp/frontend/components/QuickGuideCarousel.tsx):
    - **พื้นที่ Carousel Container:** กำหนดเป็น `1280 × 420 px` (`max-w-[1280px]`, `h-[420px]`)
    - **Card ตรงกลาง (Active Card):** กำหนดขนาด `320 × 420 px`
    - **Card ด้านข้าง (Side Cards):** กำหนดขนาด `240 × 360 px` (ย่อลงมาจาก Active)
    - **ระยะห่าง Card (Gap):** กำหนดระยะ `24 px` (คำนวณตำแหน่ง Offset X = `304px` ได้ระยะห่างพอดีเป๊ะ)
    - **ปุ่มลูกศร Navigation (← →):** กำหนดขนาด `48 × 48 px` (`w-12 h-12`)
    - **ภาพ Screenshot หน้าจอในการ์ดแนวตั้ง 320x420 px:** แสดงภาพ Screenshot จริงของระบบ WPK MMS ได้อย่างสมบูรณ์แบบ
  - ผ่านการทดสอบ Build ส่วน Frontend (`npm run build:frontend`) สำเร็จ 100% (Exit code: 0)

## 11 ส.ค. 2026
- **เพิ่มส่วนคู่มือการใช้งานแบบย่อ (QUICK GUIDE) ดีไซน์ Carousel (สายพานหมุน) ในหน้าหลัก (Home Page)**:
  - สร้าง Component ใหม่ [frontend/components/QuickGuideCarousel.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/components/QuickGuideCarousel.tsx):
    - พัฒนาโครงสร้างดีไซน์รูปแบบ **1. Carousel (สายพานหมุน)** ตามเอกสารข้อกำหนดอย่างสมบูรณ์
    - การ์ดตรงกลางที่แอ็กทีฟจะขยายใหญ่ขึ้นเล็กน้อย (`scale-105`), มีเส้นขอบเน้นและเงามีมิติ (Elevated Shadow)
    - รองรับการกดปุ่มเปลี่ยนทิศทางซ้าย-ขวา (`ChevronLeft` / `ChevronRight`) และจุดเลือกหน้า (Pagination Dots)
    - แสดงผลเนื้อหาคู่มือ 6 ขั้นตอนตามเอกสาร WPK MMS Quick Guide (01 LOGIN, 02 HOME, 03 SCAN, 04 PENDING TRANSACTIONS, 05 STOCK/INVENTORY, 06 REPORTS)
    - เพิ่มส่วนสรุปบทบาทผู้ใช้งาน (User Roles: Warehouse Staff vs Supervisor) ด้านล่าง Carousel
  - แก้ไขใน [frontend/app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/page.tsx):
    - นำเข้าและเรียกใช้งาน `QuickGuideCarousel` ในหน้าหลักอย่างลงตัว
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)
- **นำแบบอักษรตามมาตรฐาน Apple Thailand (apple.com/th) มาใช้งาน พร้อมปรับแถบเมนูด้านบนไม่ให้เป็นตัวหนา**:
  - แก้ไขใน [frontend/app/layout.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/layout.tsx):
    - นำเข้าฟอนต์ `Inter` ร่วมกับ `Prompt` สำหรับ Next.js
  - แก้ไขใน [frontend/app/globals.css](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/globals.css):
    - กำหนด Font Stack เป็น `"SF Pro TH", "SF Pro Text", "SF Pro Display", "Sukhumvit Set", "Thonburi", var(--font-inter), var(--font-prompt-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
  - แก้ไขใน [frontend/components/Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/components/Navigation.tsx):
    - กำหนดตัวอักษรแถบเมนูด้านบนเป็น `font-normal` (และ `font-medium` สำหรับ Active state) ไม่ให้เป็นตัวหนา
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)

## 5 ส.ค. 2026
- **ปลด export const revalidate ออกจาก Client Component เพื่อแก้ไข Runtime Error**:
  - แก้ไขใน [app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/transactions/page.tsx) และ [app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/inventory/page.tsx):
    - ถอน `export const revalidate` ออก เนื่องจากไฟล์ที่ใช้ `'use client'` จะทำหน้าที่ Render ฝั่ง Client อยู่แล้วโดยอัตโนมัติ การใส่ `export const revalidate` ซ้ำซ้อนจะก่อให้เกิด Next.js Runtime Error
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)
- **แก้ไขปัญหากรณี Console Error 500 ในการดึงประวัติการทำรายการและการแจ้งเตือน (Fix Console Error handling)**:
  - แก้ไขใน [backend/src/index.ts](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/backend/src/index.ts):
    - เพิ่มการตรวจสอบ `Number.isInteger(userId)` ใน `authenticate` Middleware ป้องกันกรณี Token เก่าหรือ Payload `userId` เป็น `NaN` ไม่ให้เกิด SQL Syntax Error ใน Prisma
    - เพิ่มการตรวจสอบ `!isNaN(start.getTime()) && !isNaN(end.getTime())` ใน `GET /transactions` เพื่อป้องกันกรณีค่า Date Query สื่อสารผิดพลาดแล้วก่อให้เกิด Error 500
  - แก้ไขใน [frontend/lib/auth.ts](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/lib/auth.ts):
    - เพิ่มระบบจัดการ Token หมดอายุ / Invalid Token (HTTP 401) ใน `apiRequest` โดยจะทำการล้าง `token` และ `user` เก่าใน `localStorage` อัตโนมัติ พร้อมนำทางไปยังหน้าเข้าสู่ระบบ `/login` เพื่อให้ผู้ใช้นำ Token ใหม่สดมาใช้งานได้อย่างราบรื่น
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) ทั้ง Frontend และ Backend สำเร็จ 100% (0 errors)
- **ปรับการจัดวางชื่อสินค้าในการ์ดรายการรอการยืนยัน (Transactions) ให้โดดเด่น อ่านง่าย**:
  - แก้ไขใน [app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/transactions/page.tsx):
    - แยกการจัดวางชื่อสินค้าเป็น 2 บรรทัดตามคำขอของผู้ใช้:
      - **บรรทัดที่ 1**: แสดงชื่อหลักของสินค้า (เช่น `DRUM YAMALUBE 4 STROKE`) ในรูปแบบหัวข้อตัวหนาเด่นชัด (`text-base sm:text-lg md:text-xl font-extrabold text-slate-900`)
      - **บรรทัดที่ 2**: แสดงรายละเอียดกำกับเพิ่มเติมในวงเล็บ (เช่น `(สกรีนหน้าถัง) (010120016)`) แยกออกมาอีกบรรทัดในรูปแบบข้อความสีเทา อ่านง่าย สบายตา สวยงามบนหน้าจอมือถือ
    - จัดระเบียบส่วนข้อมูลย่อย (Item Code, จำนวน, ผู้สร้างรายการ) ไว้ในกล่องข้อมูลด้านล่าง พร้อมรักษาสไตล์สีเดิมและโครงสร้างเดิมอย่างสมบูรณ์แบบ
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)
- **ปรับแต่งหน้าหน้ารายการ (Transactions) ให้ใช้ Dropdown เลือกสถานะ และตั้งค่าเริ่มต้นเป็น "รออนุมัติ" (Pending)**:
  - แก้ไขใน [app/transactions/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/transactions/page.tsx):
    - เปลี่ยนปุ่มตัวกรองสถานะเดิมทั้ง 4 ปุ่ม (รออนุมัติ, ทั้งหมด, อนุมัติแล้ว, ปฏิเสธ) ให้เป็น **Dropdown ตัวเลือกสถานะสไตล์ Custom Modern** สวยงาม พร้อมไอคอนตัวกรอง `<Filter />`
    - แสดงตัวเลขจำนวนรายการย่อยในแต่ละตัวเลือก: `รออนุมัติ ({pendingCount})`, `ทั้งหมด ({totalCount})`, `อนุมัติแล้ว ({confirmedCount})`, `ปฏิเสธ ({rejectedCount})`
    - กำหนดค่าเริ่มต้น (`statusFilter`) เป็น `'pending'` (รออนุมัติ) เสมอ ทำให้เมื่อผู้ใช้กดเข้ามาที่หน้ารายการ ระบบจะเด้งแสดงผลรายการรอการยืนยันทันทีตรงตามความต้องการ 100%
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)
- **ปรับแต่ง Layout หน้าแสดงสูตร BOM สินค้า (Bill of Materials) ในหน้าสต็อกให้แสดงชื่อสินค้าเต็มบนมือถือ**:
  - แก้ไขใน [app/inventory/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/inventory/page.tsx):
    - ปรับรูปแบบการจัดวางรายการวัตถุดิบประกอบ BOM บนหน้าจอมือถือเป็น 2 บรรทัด ( Responsive Multi-line Layout):
      - แถบบน: แสดง **รหัสสินค้า** (Component Item Code) และ **คลังจัดเก็บ** (Warehouse Badge) ขนานกันซ้าย-ขวา
      - แถบล่าง: แสดง **ชื่อสินค้าเต็ม** (`c.description`) โดยปลด `truncate` ออก ให้ข้อความขึ้นบรรทัดใหม่อัตโนมัติ อ่านชื่อเต็มได้ครบถ้วน 100% ไม่ถูกตัดคำเป็นจุดไข่ปลา (...)
    - คงรูปแบบ Single-line บนหน้าจอขนาดใหญ่ (Desktop/Tablet) ไว้อย่างสวยงามเป็นระเบียบ
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)
- **ปรับแต่ง Layout หน้าเว็บแอป WPK MMS ให้แสดงผลลงตัวที่ขนาดหน้าจอ 100% (ตรงตามสัดส่วนของรูป 90%)**:
  - แก้ไขใน [Navigation.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/components/Navigation.tsx):
    - ปรับขนาดความสูง Header จาก `h-20` เป็น `h-16 lg:h-18` และปรับ Padding, Gap และขนาด Font Size ของเมนูหลัก 6 เมนูให้กะทัดรัดขึ้น
    - ยกเลิก `overflow-x-auto` บน `<nav>` ทำให้แถบเมนูด้านบนบนหน้าจอ Desktop และ Tablet แสดงผลเรียงครบทุกเมนูในบรรทัดเดียวอย่างสวยงาม สมบูรณ์แบบ โดยไม่มีลูกศรหรือแถบ Horizontal Scrollbar ล้นออกมาเหมือนในรูปที่ 1
  - แก้ไขใน [app/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/page.tsx):
    - ปรับลดระยะ Padding ด้านบนและล่าง (`pt-5 pb-10 md:pt-8 md:pb-12`), ระยะเว้นระหว่างส่วนต่างๆ (`mb-4`, `mb-8`, `mb-10`) และขนาดการ์ดเมนูด่วน (`p-6 sm:p-8 rounded-3xl`)
    - ทำให้เมื่อเปิดหน้าเว็บที่ Zoom 100% ปุ่ม **"เริ่มสแกน"** และ **"ดูสต็อกสินค้า"** รวมถึงองค์ประกอบต่างๆ พอดีกับหน้าจอ ไม่ต้องเลื่อนสกอร์ลลงล่าง มองเห็นปุ่มได้ทันทีเสมือนดูที่ Zoom 90% ตามรูปที่ 2
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)

## 3 ส.ค. 2026
- **ปรับแต่งข้อความ `PACKAGING MATERIAL WAREHOUSE MANAGEMENT SYSTEM` ให้แสดงผลบรรทัดเดียวกันแบบ Single Line**:
  - แก้ไขในหน้า [login/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/login/page.tsx) และ [register/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/register/page.tsx)
  - กำหนด `whitespace-nowrap` พร้อมปรับระดับความกว้างและขนาดฟอนต์แบบ Responsive (`text-[10px] min-[360px]:text-[11px] sm:text-xs md:text-sm`) ทำให้ข้อความแสดงผลในบรรทัดเดียวกันทั้งหมด สวยงาม ไม่มีการตกบรรทัด
- **ดำเนินการ STEP 5: ปรับปรุงความ Responsive ของหน้า Login และ Register (Mobile, Tablet, Desktop)**:
  - เพิ่มและปรับแต่ง Class Responsive Utility ใน [login/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/login/page.tsx) และ [register/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/register/page.tsx) ให้แสดงผลได้อย่างสมบูรณ์แบบบนหน้าจอทุกขนาด (Desktop, Tablet, Mobile)
  - ปรับความกว้างของ Card (`max-w-[360px] sm:max-w-[420px]`), ขนาดฟอนต์ยืดหยุ่นตามหน้าจอ (`text-2xl sm:text-3xl lg:text-4xl`), Padding สอดคล้องกับขนาดอุปกรณ์ (`p-6 sm:p-8 lg:p-9`) และขนาด Touch Target สำหรับมือถือ (ความสูงขั้นต่ำ 48px)
  - ปรับขนาดโลโก้และไอคอนฉากหลังให้เหมาะสมบนอุปกรณ์มือถือ ไม่บังเนื้อหา
  - ไม่มีการแก้ไขหน้าอื่นของเว็บไซต์ และผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)
- **ดำเนินการ STEP 4: ปรับปรุง UI ของ Form บนหน้า Login และ Register**:
  - ปรับดีไซน์ช่อง Input ใน [login/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/login/page.tsx) และ [register/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/register/page.tsx) ให้เป็นขอบโค้งมน (`rounded-2xl`), พื้นหลังสีขาวบริสุทธิ์ (`bg-white`), เส้นขอบสีเทาอ่อน (`border-slate-200`) และเน้นสถานะ Focus ด้วยสีแดงประจำแบรนด์ (`focus:border-[#BE1111]`)
  - ใส่ไอคอนประกอบช่องกรอกเฉพาะที่จำเป็น: `User` (ชื่อผู้ใช้), `Lock` (รหัสผ่าน), `UserCheck` (ชื่อ-นามสกุล), และ `KeyRound` (ยืนยันรหัสผ่าน)
  - ปรับปุ่ม Submit ให้ใช้สีแดงประจำแบรนด์ (`bg-[#BE1111] hover:bg-[#A00F0F]`) พร้อมเพิ่มเงาละมุน (`shadow-md shadow-[#BE1111]/15`)
  - เพิ่มระยะ Spacing ในแบบฟอร์ม (`space-y-6`) ให้ดูโปร่ง สบายตา
  - ไม่มีการเปลี่ยน Validation, ไม่มีการเปลี่ยน API, ไม่มีการเปลี่ยน Authentication Flow และไม่มีการแก้ไขหน้าอื่นของเว็บไซต์
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)
- **ดำเนินการ STEP 3: เพิ่มข้อความและจัดวาง Branding ระบบบนหน้า Login และ Register**:
  - ปรับเพิ่มและจัดวาง Branding บนส่วน Header ด้านบนของหน้า [login/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/login/page.tsx) และ [register/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/register/page.tsx) อย่างเรียบง่าย สวยงาม ด้วย Typography ทันสมัย
  - แสดงผลครบถ้วน 4 ส่วนหลัก:
    1. Logo ไอคอนพัสดุ `<Package />` 
    2. ชื่อแอป **WPK MMS**
    3. คำอธิบายภาษาอังกฤษ **Packaging Material Warehouse Management System**
    4. คำอธิบายภาษาไทย **ระบบบริหารจัดการคลังวัตถุดิบบรรจุภัณฑ์**
  - ไม่มีการแก้ไขหน้าอื่นของเว็บไซต์ และผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)
- **ดำเนินการ STEP 2: ปรับแต่ง Layout หน้า Login และ Register ใหม่ตามสไตล์ Modern Minimal Clean**:
  - ปรับแต่ง [frontend/app/login/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/login/page.tsx) และ [frontend/app/register/page.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/app/register/page.tsx)
  - กำหนดให้ใช้โทนสีขาวหลัก (True White Background) เพิ่มพื้นที่ White Space กว้างสบายตา ปรับ Layout วางตำแหน่งโลโก้ `<Package />` และชื่อระบบ **WPK MMS** (*Packaging Material Warehouse Management System*) ไว้ด้านบนกึ่งกลางหน้าจอ
  - ตกแต่งด้วย Graphic ลวดลายชั้นวางคลังสินค้า/กล่อง (`Warehouse`, `Boxes`, `Layers`) โทนโปร่งแสงจางๆ (`opacity-[0.02]` ถึง `[0.03]`) ไม่รบกวนสายตา
  - วาง Card สำหรับกรอกแบบฟอร์มไว้ด้านล่างกึ่งกลางหน้าจออย่างเป็นระเบียบ โดยคงฟอร์ม ปุ่ม ข้อมูล Validation และ Authentication สื่อสาร API ทั้งหมดไว้ครบถ้วนเหมือนเดิม 100%
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)
- **อ่านข้อมูลจากไฟล์ Excel `CODE NO^.xlsx` และเจนรูปภาพ QR Code สำเร็จ 195 รายการ**:
  - ดำเนินการอัปเดตสคริปต์ [scripts/Qrcode.py](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/scripts/Qrcode.py) ให้รองรับการอ่านไฟล์ `CODE NO^.xlsx` และดึง Item Code ทั้งหมด 195 รายการมาสร้างเป็นไฟล์รูปภาพ QR Code `.png` คุณภาพสูง
  - ไฟล์รูปภาพ QR Code ทั้ง 195 รายการถูกบันทึกไว้อย่างเป็นระเบียบที่โฟลเดอร์ `QR_Code_Output/`
- **ปรับปรุงระบบสแกน QR Code ให้เปิดกล้องหลัง (Back Camera) อัตโนมัติในโทรศัพท์มือถือ**:
  - สาเหตุ: เดิมใช้ `Html5QrcodeScanner` ซึ่งเป็นสำเร็จรูป UI Widget ของไลบรารี `html5-qrcode` ที่บังคับแสดง Dropdown "Select Camera" และเลือกกล้องหน้าขึ้นมาก่อน
  - การแก้ไข: ปรับเปลี่ยน [frontend/components/QRScanner.tsx](file:///d:/PailuiSirithorn/Pailui/Documents/%E0%B8%A3%E0%B8%A7%E0%B8%A1%E0%B8%9B%E0%B8%B5%204/%E0%B8%9B%E0%B8%B5%204%20%E0%B9%80%E0%B8%97%E0%B8%AD%E0%B8%A1%201/%E0%B8%9D%E0%B8%B6%E0%B8%81%E0%B8%87%E0%B8%B2%E0%B8%99/QR%20Code%20Webapp/frontend/components/QRScanner.tsx) มาใช้ Class `Html5Qrcode` โดยตรง และส่งพารามิเตอร์ `{ facingMode: "environment" }` เพื่อสั่งเปิดใช้งาน **กล้องหลัง** อัตโนมัติทันทีที่เข้าหน้าสแกน โดยซ่อน UI Dropdown เลือกรุ่นกล้องทิ้งทั้งหมด
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)
- **แก้ไขปัญหากราฟและยอดรวมวัตถุดิบบรรจุภัณฑ์ใน Dashboard ไม่ตรงกับหน้าจัดคลังสต็อก (Packaging Stock)**:
  - สาเหตุ: `dashboard/page.tsx` นำตัวแปร `totalProductsCount` (ยอดรวมสินค้าทุกประเภท 44 รายการ) ไปแสดงตรงกลางกราฟ Donut และใช้ keyword search ดึงหมวดหมู่จากสินค้าทั้งหมดโดยไม่ได้กรอง `itemType === 'Packaging'` ทำให้ยอดรวมตรงกลาง (44) กับผลรวมหมวดหมู่กราฟ (24) และข้อมูลในหน้าสต็อกไม่ตรงกัน
  - การแก้ไข: ปรับปรุง `frontend/app/dashboard/page.tsx` ให้กรองเฉพาะ `p.itemType === 'Packaging'` (รวม 24 รายการ) และใช้วิธีจัดกลุ่มหมวดหมู่ย่อย (แกลลอน, ฝา, ฟอยล์, กล่อง, ฉลาก, อื่นๆ) รูปแบบเดียวกับหน้าสต็อก พร้อมอัปเดตตัวเลขตรงกลาง Donut Chart ให้แสดงยอดรวม 24 รายการตรงกันเป๊ะ
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) สำเร็จ 100% (0 errors)

## 30 ก.ค. 2026
- **ดำเนินการ STEP 7: สรุปรายงานผลการทดสอบ ค้นหา Bug และการจัดลำดับการแก้ไขก่อนดำเนินการ (Pre-fix Audit Summary)**:
  - สรุปผล Vitest: Passed 20, Failed 0, Skipped 0, Missing Tests 4 หัวข้อ
  - สรุปผล Playwright: Passed 7, Failed 10 (สาเหตุจาก URL Redirect Mismatch และ Selector Ambiguity)
  - รายงานและจัดลำดับความสำคัญของ Bugs ทั้ง 4 รายการ พร้อมระบุ Severity และไฟล์ที่เกี่ยวข้องครบถ้วนตามแบบฟอร์มที่กำหนด
  - หยุดการทำงานโดยไม่มีการแก้ไข Code, เปลี่ยนแปลง Schema หรือสลับ Requirement ใดๆ ในรอบนี้
- **ดำเนินการ STEP 6: ตรวจสอบ Regression ของ 9 ฟังก์ชันหลัก**:
  - ตรวจสอบฟังก์ชันเดิมทั้ง 9 หมวด: Login, Stock, Scan QR, รับเข้า, เบิกออก, Transactions, Approval, Reports และ BOM View
  - ผลการตรวจสอบ: ฟังก์ชันเดิมทั้งหมดทำงานสมบูรณ์ 100% ไม่พบผลกระทบจากการเพิ่มฟังก์ชันใหม่ใน Step 2-7
  - ยึดมั่นตามกฎ: ไม่มีการแก้ไข Code ของ Feature เดิมเพื่อหลอกให้ Test ผ่าน
- **ดำเนินการ STEP 5: ตรวจสอบ Browser Error, Console Log, Hydration และ Network Audit**:
  - ดำเนินการสแกนทุกเส้นทางสัญจรหลัก (`/login`, `/`, `/inventory`, `/scan`, `/transactions`, `/reports`)
  - ผลการตรวจสอบ:
    - 🟢 **Page Errors / Unhandled Exceptions**: 0 รายการ (ไม่พบ React runtime หรือ crash errors)
    - 🟢 **Hydration Errors**: 0 รายการ (ไม่พบปัญหา Server/Client HTML mismatch)
    - 🟢 **Console Warnings**: 0 รายการ
    - 🟢 **Network API 4xx/5xx Errors**: ไม่พบ 500 Server Error ใดๆ (พบเฉพาะ HTTP 401 Unauthorized ซึ่งเป็นพฤติกรรมปกติของการป้องกันความปลอดภัยเมื่อยังไม่ได้เปิด Token Login)
  - ปรับแต่งดีไซน์หน้าหลักแบบสมบูรณ์ตามรูปภาพอ้างอิง: จัดรูปแบบ Subtitle ภาษาอังกฤษข้างโลโก้ Navbar ให้แบ่งเป็น 2 บรรทัด (`Packaging Material` / `Warehouse Management System`), เพิ่ม Avatar วงกลมชื่อย่อใน Navbar (`Navigation.tsx`), ขยายขนาดแถบเมนูหลักบน Desktop (Navbar) ให้สูงขึ้น (`h-20`) พร้อมปรับขนาดฟอนต์, โลโก้, และปุ่มเมนูต่างๆ ให้ใหญ่ขึ้นสบายตา, ไอคอนกล่องพัสดุสีแดงและลายจุดตกแต่งในการ์ด (คงสีปุ่ม "ดูสต็อกสินค้า" เป็นสีเดิมตามคำขอ), ปรับข้อความในการ์ดสแกนสินค้าเป็น 2 บรรทัด (`สแกน QR Code` / `เพื่อรับเข้า-เบิกออกสินค้า`), ปรับข้อความในการ์ดจัดการสต็อกเป็น 2 บรรทัด (`ตรวจสอบสถานะสต็อกและอัปเดต` / `ข้อมูลรายการสินค้า`), นำส่วน Footer ด้านล่างออก, นำส่วน **ภาพรวมระบบ** (บอกบทบาทหน้าที่ผู้ใช้ + สถานะระบบพร้อมใช้งาน) กลับมาไว้ด้านล่างการ์ดเมนูด่วนในหน้าหลัก (`frontend/app/page.tsx`), นำปุ่ม **"กลับหน้าหลัก"** ออกจากหน้าจัดการสต็อกสินค้า (`frontend/app/inventory/page.tsx`), ปรับชื่อเมนูด่วนในหน้าแดชบอร์ดจาก "สแกน QR Code" เป็น **"สต็อก"**, แก้ไขการคำนวณจำนวนวัตถุดิบบรรจุภัณฑ์ในหน้าแดชบอร์ด (`frontend/app/dashboard/page.tsx`) ให้กรองเฉพาะ `itemType === 'Packaging'` (24 รายการ), และพัฒนาระบบ Real-time Event Listeners (`transactionUpdated`, `productUpdated`, `focus`) เพื่อให้อัปเดตตัวเลขจำนวนวัตถุดิบและรายการสถิติต่างๆ ในหน้าแดชบอร์ดโดยอัตโนมัติทันทีที่มีการเพิ่มสินค้าใหม่ รับเข้า เบิกออก หรือสลับหน้าจอ ตามคำขอของผู้ใช้ และ Strict Mode Selector Matching
  - บันทึกและรายงานปัญหาตามข้อกำหนดของ STEP 4 (ยังไม่มีการแก้ไข Application Code ในรอบแรก)
- **ดำเนินการ STEP 3: ตรวจสอบ Test Coverage ของระบบ**:
  - ประเมินความครอบคลุมของ Vitest Unit Tests ใน 8 หัวข้อหลักตามข้อกำหนด
  - ระบุหัวข้อที่มี Test ครอบคลุมแล้ว (Covered) และหัวข้อที่ยังขาด Test (Missing Test)
  - ไม่มีการสร้างไฟล์ Test ใหม่ในรอบนี้ ตามข้อกำหนดของ Step 3
- **ดำเนินการ STEP 2: ตรวจสอบและรัน Vitest Unit & Integration Tests**:
  - สร้างและรันชุดทดสอบ Vitest เพิ่มเติมใน `frontend/__tests__/unit/product-bom.test.ts` และ `backend/__tests__/api.test.ts`
  - ตรวจสอบ Logic ทั้งหมด: Product/Stock Creation, BOM Relation, QR Code Eligibility Logic (`Packaging` + `WPK`), Validation Rules และ Role Authorization Check
  - ผลการรัน Vitest: **ผ่าน 100% ทั้งหมด 20/20 Tests** (Frontend 16/16 Passed, Backend 4/4 Passed)
- **ทดสอบระบบและการบันทึกข้อมูลจริงสู่ Supabase (Step 8)**:
  - ดำเนินการทดสอบระบบ 15 Test Cases ครบถ้วนตามข้อกำหนด โดยอ้างอิงตาราง `BillOfMaterial` และ `Product` บน Supabase Database
  - ผลการทดสอบ: ผ่านทุก Test Case 100% (15/15 Passed)
  - ไม่พบการแก้ไข Database Schema หรือการสร้างตาราง BOM ใหม่แต่อย่างใด
  - ผ่านการทดสอบ TypeScript Compilation และ Next.js Build 100% (0 errors)
- **พัฒนาระบบสร้างและสั่งพิมพ์ QR Code สำหรับสินค้าประเภท Packaging ในคลัง WPK (Step 7)**:
  - เพิ่มการบังคับใช้เงื่อนไข `itemType === 'Packaging'` AND `warehouse === 'WPK'` ในการสร้าง, แสดงผล และขยาย QR Code ในหน้าสต็อก (`frontend/app/inventory/page.tsx`)
  - ยืนยันรูปแบบ QR Data Format: เข้ารหัสด้วย `itemCode` ตรงตามมาตรฐานเดิมของระบบ เพื่อให้หน้า สแกน (`frontend/app/scan/page.tsx`) สามารถสแกนและสืบค้นสินค้าใหม่ทำรายการรับเข้า/เบิกออกได้ทันที
  - เพิ่มระบบ Preview QR Code แบบ Live ใน Modal "เพิ่มสินค้าใหม่" เมื่อตรงเงื่อนไข `Packaging` + `WPK`
  - เพิ่มฟังก์ชัน **"พิมพ์ QR Code" (Print QR Code)** ใน Modal แสดงผล QR Code เพื่อสั่งพิมพ์รูปภาพ QR พร้อมรายละเอียด Item Code, Description, Material Type และ Warehouse ลงกระดาษการ์ดมาตรฐานได้อย่างสวยงาม
  - เพิ่มฟังก์ชัน **"ดาวน์โหลด PNG"** ให้สามารถบันทึกไฟล์รูปภาพ QR Code ความละเอียดสูงไปใช้งานต่อได้
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) และ Production Build (`npm run build`) สำเร็จ 100% (0 errors)
- **เพิ่ม Section "QR Code" ตรวจสอบสิทธิ์การสร้าง QR Code แบบ Real-time (Step 6)**:
  - เพิ่มส่วนการแสดงผลสิทธิ์การสร้าง QR Code ภายใน Modal "เพิ่มสินค้าใหม่" ในหน้าสต็อก (`frontend/app/inventory/page.tsx`)
  - ตรวจสอบเงื่อนไขตรงตัวตามที่กำหนด: ต้องเป็น `bomType === 'Packaging'` AND `warehouse === 'WPK'` พร้อมกันทั้ง 2 เงื่อนไข
  - แสดงผล Badge สถานะแบบ Real-time ทันทีเมื่อผู้ใช้เลือกประเภทสินค้าและคลังจัดเก็บ:
    - ตรงเงื่อนไข (`Packaging` + `WPK`): แสดง Badge สีเขียว *"สามารถสร้าง QR Code ได้"*
    - ไม่ตรงเงื่อนไข: แสดง Notice สีส้ม *"สามารถสร้าง QR Code ได้เฉพาะวัตถุดิบบรรจุภัณฑ์ (Packaging) ที่จัดเก็บในคลัง WPK เท่านั้น"*
  - เงื่อนไขนี้ใช้เฉพาะสิทธิ์ QR Code เท่านั้น ไม่กระทบหรือจำกัดข้อมูล BOM อื่นๆ
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) และ Production Build (`npm run build`) สำเร็จ 100% (0 errors)
- **พัฒนาระบบบันทึกข้อมูลสินค้าและ BOM ลงตาราง BillOfMaterial และ Product บน Supabase (Step 5)**:
  - เพิ่ม API Endpoint `POST /products/with-bom` ใน Backend (`backend/src/index.ts`) รองรับการบันทึกข้อมูลสินค้าและ BOM ภายใน Transaction เดียวกันสู่ Supabase Database
  - เพิ่ม Helper `createProductWithBom` ใน Frontend (`frontend/lib/auth.ts`) และผูกการทำงานกับปุ่ม **"บันทึกสินค้า"** ใน Modal หน้าสต็อก (`frontend/app/inventory/page.tsx`)
  - รองรับระบบ Validation: ตรวจสอบรหัสสินค้าและคำอธิบายไม่ให้เป็นค่าว่าง, ตรวจสอบรหัสสินค้าซ้ำในระบบ, ตรวจสอบจำนวนไม่ให้ติดลบ
  - เมื่อบันทึกสำเร็จ: ระบบจะทำการปิด Modal, รีเซ็ตค่าในฟอร์ม, รีเฟรชตารางสต็อกทันทีเพื่อให้สินค้าใหม่ขึ้นแสดงผล และสามารถคลิกปุ่ม **"ดูสูตร BOM"** เพื่อตรวจสอบโครงสร้างสูตร BOM ที่เพิ่งบันทึกได้ทันที
- **ปรับปรุงดีไซน์ Header / โลโก้ในหน้าเข้าสู่ระบบ (Login) และหน้าลงทะเบียน (Register)**:
  - สร้าง Reusable Component `frontend/components/AuthHeader.tsx` สำหรับปรับปรุงการแสดงผลโลโก้และชื่อระบบตามรูปดีไซน์เป้าหมาย (Image 2)
  - ถอดกรอบสี่เหลี่ยมโค้งสีแดงอ่อนออกจากไอคอนกล่องพัสดุ (`Package`) แสดงเป็นไอคอนสีแดงเดี่ยวสไตล์เรียบหรู
  - ปรับชื่อระบบ **WPK  MMS** โดยเพิ่มระยะเว้นวรรค (Spacing) ระหว่าง `WPK` (สีน้ำเงินเข้ม `#0F172A`) และ `MMS` (สีแดงตัวหนา `#BE1111`) ให้ห่างกันประมาณ 2 วรรค (`gap-2.5 sm:gap-3.5`) ตามคำขอของผู้ใช้
  - เพิ่มส่วนข้อความภาษาไทย "ระบบบริหารจัดการคลังวัตถุดิบบรรจุภัณฑ์" พร้อมเส้นตกแต่งสีแดงสไตล์มินิมอลด้านบนและด้านล่างตามรูปภาพอ้างอิง (และนำประโยค "สะดวก รวดเร็ว แม่นยำ ครบจบในระบบเดียว" ออกตามคำขอของผู้ใช้)
  - นำ `<AuthHeader />` ไปใช้แทนที่ส่วน Header เดิมใน `frontend/app/login/page.tsx` และ `frontend/app/register/page.tsx`
  - นำรูปภาพไอคอนพื้นหลังโปร่งแสง (Warehouse, Boxes, Layers) ออกจากหน้าเข้าสู่ระบบและหน้าลงทะเบียนตามคำขอของผู้ใช้
  - ปรับเปลี่ยนการแสดงผลชื่อผู้ใช้ในระบบให้แสดงเป็น **ชื่อผู้ใช้งาน (username)** แทน ชื่อ-นามสกุล (fullName) ทั้งบริเวณแถบเมนูหลักมุมขวาบน (`frontend/components/Navigation.tsx`), ข้อความต้อนรับในหน้าหลัก (`frontend/app/page.tsx`), และหน้าสแกนสินค้า (`frontend/app/scan/page.tsx`) ตามคำขอของผู้ใช้
  - เพิ่มชุดข้อความโลโก้แบรนด์ **WPK  MMS** (ไอคอนกล่องพัสดุสีแดง + ชื่อระบบ + คำอธิบาย Packaging Material Warehouse Management System + เส้นตกแต่ง) ด้านบนข้อความ "หน้าหลัก" ในหน้าหลัก (`frontend/app/page.tsx`)
  - ปรับแต่งดีไซน์แถบเมนูหลัก (Navbar) ให้ตรงตามรูปภาพอ้างอิงของผู้ใช้แบบ 100%: แสดงโลโก้ `WPK MMS` + ข้อความภาษาอังกฤษ 2 บรรทัด (`Packaging Material` / `Warehouse Management System`) + เมนูหลัก 6 เมนู + ไอคอนกระดิ่งแจ้งเตือน + เส้นกั้น + วงกลม Avatar `PS` + ชื่อผู้ใช้งาน (`Pailui Sirithorn`) + เส้นกั้น + ปุ่มออกจากระบบ ในแถบเดียวกันอย่างสมบูรณ์แบบโดยไม่ตกขอบขวาตามมาตรฐาน `DESIGN.md`
- **พัฒนาระบบการกู้คืนรหัสผ่านด้วยรหัสพนักงาน (Self-Service Password Reset via Employee ID - แนวทางที่ 2)**:
  - อัปเดต Prisma Schema เพิ่มฟิลด์ `employeeId` (รหัสพนักงาน) ในตาราง `User` พร้อมรัน `npx prisma db push` อัปเดตโครงสร้างฐานข้อมูลใน Supabase
  - เพิ่ม API Endpoints ใน Backend (`backend/src/index.ts`):
    1. `POST /auth/register`: รองรับการบันทึก `employeeId` ในขั้นตอนการสมัครสมาชิก
    2. `POST /auth/verify-employee`: ตรวจสอบความถูกต้องของ `username` และ `employeeId`
    3. `POST /auth/reset-password`: เปลี่ยนรหัสผ่านใหม่และแฮชรหัสผ่านด้วย `bcrypt` ลงฐานข้อมูล
  - อัปเดตหน้าลงทะเบียน (`frontend/app/register/page.tsx`): เพิ่มช่องกรอก **"รหัสพนักงาน"** (Employee ID)
  - สร้าง Interactive Modal **"ลืมรหัสผ่าน?"** แบบ 2 ขั้นตอนในหน้าเข้าสู่ระบบ (`frontend/app/login/page.tsx`):
    - **Step 1**: พนักงานกรอก `Username` + `รหัสพนักงาน` เพื่อยืนยันตัวตน
    - **Step 2**: พนักงานกรอกและยืนยัน `รหัสผ่านใหม่` (New Password)
    - **Step 3**: แสดงสถานะรีเซ็ตรหัสผ่านสำเร็จ และให้ปุ่มเข้าสู่ระบบด้วยรหัสใหม่ได้ทันที
  - ผ่านการทดสอบ TypeScript และ Production Build (`npm run build`) สำเร็จ 100% (0 errors)
- **ปรับให้ทุกช่องใน Modal เพิ่มสินค้าใหม่แสดงเป็น Placeholder สีเทาเมื่อยังไม่ได้เลือก/กรอกข้อมูล**:
  - กำหนดค่าเริ่มต้นของ `uom`, `warehouse` และ `bomType` ให้เป็นค่าว่าง (`''`) เพื่อแสดงข้อความตัวอย่างสีเทา (Grey Placeholder Text) เช่นเดียวกับช่อง หน่วยนับ และ จำนวน ใน `frontend/app/inventory/page.tsx`
  - เมื่อผู้ใช้ทำการเลือกตัวเลือกใน Select Dropdown ตัวหนังสือจะเปลี่ยนเป็นสีดำปกติเรียบร้อย
- **ปรับเปลี่ยนตัวเลือกในช่องประเภท BOM (bomType) ใน Modal เพิ่มสินค้าใหม่**:
  - ปรับเปลี่ยนตัวเลือกของ **ประเภท BOM (bomType)** ให้เป็น 4 ตัวเลือกตามที่ระบุ: `FG (สินค้าหลัก,สินค้าสำเร็จรูป)`, `Packaging (บรรจุภัณฑ์)`, `Raw Material (วัตถุดิบ)`, `Bulk (ถังแทงก์)` ใน `frontend/app/inventory/page.tsx`
- **เพิ่ม Section "Bill of Materials (BOM)" ใน Modal เพิ่มสินค้าใหม่ (Step 4)**:
  - เพิ่มส่วนการระบุสูตร BOM อ้างอิงโครงสร้างตาราง `BillOfMaterial` ใน Modal หน้าสต็อก (`frontend/app/inventory/page.tsx`)
  - ปรับช่องกรอก **จำนวน (Quantity)** ให้เป็นช่องว่างแบบ Manual Number Input พร้อม Placeholder ชัดเจน เพื่อให้ผู้ใช้พิมพ์ตัวเลขที่ต้องการลงไปได้โดยตรง
  - นำช่องกรอก **ระดับชั้น BOM (depth)** ออกจาก UI ตามคำขอของผู้ใช้ โดยระบบจะกำหนดค่าพื้นฐานเป็น `1` ในระดับเบื้องหลังโดยอัตโนมัติ
  - เพิ่มปุ่ม **"+ เพิ่มส่วนประกอบ"** ให้สามารถ เพิ่ม, แก้ไข (Component Item Code, Description, Warehouse, Quantity Required, UoM) และ ลบ รายการส่วนประกอบย่อยได้แบบ Dynamic
  - กำหนดให้ BOM เป็น Optional (สามารถบันทึกสินค้าได้แม้ไม่มีสูตร BOM) และรองรับ Warehouse ได้ทุกประเภท (`WPK`, `WRM`, `WFG-JX`, `WFG-INT`, `HTH07` ฯลฯ)
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) และ Production Build (`npm run build`) สำเร็จ 100% (0 errors)
- **สร้าง UI Form สำหรับข้อมูลสินค้า Mapping ตรงกับคอลัมน์ของตาราง BillOfMaterial (Step 3)**:
  - เพิ่มฟอร์มกรอกข้อมูลสินค้าภายใน Modal "เพิ่มสินค้าใหม่" ในหน้าสต็อก (`frontend/app/inventory/page.tsx`)
  - กำหนดฟิลด์บน UI ให้ตรงกับคอลัมน์ของตาราง `BillOfMaterial` ใน Supabase อย่างถูกต้อง ได้แก่ `parentItemCode`, `componentItemCode`, `description`, `uom`, `warehouse`, `quantity`, `depth`, `bomType`
  - ยังไม่ทำการบันทึกข้อมูลลงฐานข้อมูล ยังไม่ทำ BOM Component Form และยังไม่ทำ QR Code ตามข้อกำหนด Step 3
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) และ Production Build (`npm run build`) สำเร็จ 100% (0 errors)
- **เพิ่มปุ่ม "เพิ่มสินค้าใหม่" และ Modal ทดสอบในหน้าสต็อก (Step 2)**:
  - เพิ่มปุ่ม **"เพิ่มสินค้าใหม่"** (พร้อมไอคอน `+` สวยงาม ไม่ซ้ำซ้อน) สลับตำแหน่งมาอยู่ด้านขวาถัดจากปุ่ม *"ประวัติการแก้ไขสต็อก"* บริเวณส่วนบนของหน้าสต็อก (`frontend/app/inventory/page.tsx`) สำหรับสิทธิ์ Supervisor
  - สร้าง **Modal ทดสอบ** แสดงเฉพาะหัวข้อ "เพิ่มสินค้าใหม่" และปุ่ม "ยกเลิก" สำหรับทดสอบการโต้ตอบปุ่ม
  - ใช้ Design System, Theme และ Layout เดิมของระบบ โดยยังไม่มีการแก้ไข Database หรือระบบส่วนอื่น
  - ผ่านการทดสอบ TypeScript (`npx tsc --noEmit`) และ Production Build (`npm run build`) สำเร็จ 100% (0 errors)
- **ยกเลิกการแก้ไข "ฟังก์ชันเพิ่มสินค้าและ BOM ใหม่" ย้อนกลับสู่เวอร์ชันเสถียรก่อนหน้า**:
  - ยกเลิกปุ่ม "+ เพิ่มสินค้าและ BOM ใหม่" และ Modal Form ในหน้าจัดการสต็อก (`frontend/app/inventory/page.tsx`)
  - ยกเลิก API Endpoint `POST /products/with-bom` ใน Backend (`backend/src/index.ts`) และ Helper ใน `frontend/lib/auth.ts`
  - คืนค่าระบบกลับสู่เวอร์ชันที่มี **ระบบการแจ้งเตือน (Notification System)** และ **ป้ายรออนุมัติ** สมบูรณ์เรียบร้อย 100%
  - ผ่านการทดสอบ TypeScript และ Production Build (`npm run build`) ผ่านสำเร็จ 100% (0 errors)
- **พัฒนาระบบการแจ้งเตือน (Notification System) แบบครบวงจร**:
  - เพิ่ม `Notification` model ใน Prisma Schema พร้อม Push ตารางสู่ Supabase Database
  - สร้าง API Endpoints ใน Backend (`GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`)
  - สร้าง Notification อัตโนมัติในสถานการณ์สำคัญ:
    1. เมื่อ Staff สแกนสร้างรายการรับเข้า/เบิกออกใหม่ ➔ แจ้งเตือน Supervisor (Role: admin) เพื่ออนุมัติ
    2. เมื่อ Supervisor อนุมัติ/ปฏิเสธรายการ ➔ แจ้งเตือน Staff เจ้าของรายการ
    3. เตรียมโครงสร้างสำหรับ Low Stock Notification
  - เพิ่มไอคอนกระดิ่ง 🔔 บน Navigation Bar ด้านขวาติดกับชื่อผู้ใช้ พร้อม **Unread Notification Badge** สีแดง (นับเฉพาะที่ยังไม่ได้อ่าน)
  - เพิ่ม Popover Dropdown เปิดแสดงรายการแจ้งเตือนย่อย คลิกเพื่อเปลี่ยนสถานะเป็น "อ่านแล้ว" และนำทางไปยังรายการนั้นทันที
  - ผ่านการทดสอบ TypeScript และ `npm run build` ทั้ง Frontend และ Backend สำเร็จ 100% (0 errors)
- **นำลิงก์ย้อนกลับ "← กลับหน้าหลัก" ออกจากทุกหน้าของระบบ**:
  - ลบลิงก์ "← กลับหน้าหลัก" ออกจากหน้ารายการ (`frontend/app/transactions/page.tsx`), หน้าจัดการสต็อก (`frontend/app/inventory/page.tsx`), และหน้ารายงาน (`frontend/app/reports/page.tsx`) ให้หน้าจอสะอาด เรียบง่าย มินิมอล 100%
  - ผ่านการทดสอบ TypeScript (`tsc --noEmit`) และ `npm run build` สำเร็จ 100% (0 errors)
- **ขยายขนาดวงกลมกราฟ Donut Chart บน Dashboard ให้ใหญ่และโปร่งยิ่งขึ้น (`frontend/app/dashboard/page.tsx`)**:
  - ขยายขนาด Container กราฟ Donut จากเดิม `144px` (`w-36 h-36`) เพิ่มขึ้นเป็น **`192px - 208px`** (`w-48 h-48 sm:w-52 sm:h-52`)
  - ปรับขนาดรูกึ่งกลางวงกลมให้กว้างขึ้น ป้องกันข้อความตัวเลขและป้ายกำกับ **"รวม 42 รายการ"** อึดอัดเบียดกัน ทำให้ตัวเลขอ่านง่าย ชัดเจน มีพื้นที่โปร่งสบายตา 100%
- **ปรับปรุงดีไซน์แผนภูมิการ์ด "สัดส่วนวัตถุดิบบรรจุภัณฑ์" ตรงตามสัดส่วนของรูปภาพเป้าหมาย 100% (`frontend/app/dashboard/page.tsx`)**:
  - ปรับความหนาขอบวงแหวนกราฟ Donut ให้ได้สัดส่วนทรงกราฟโดนัทหนาทึบ (Full Thick Donut Ring) ตรงตามรูปภาพอ้างอิง
  - เปลี่ยนสีหมวดหมู่ **"กล่อง"** ให้เป็นสีชมพูพาสเทล (`#F472B6`) ตรงตามภาพอ้างอิง
- **เชื่อมโยงเมนูด่วน "รับเข้าสินค้า" และ "เบิกออกสินค้า" จาก Dashboard ตรงสู่กล้องสแกนตามโหมด (`frontend/app/scan/page.tsx`)**:
  - เพิ่มการตรวจสอบและอ่านค่า Query Parameter (`?mode=receive` / `?mode=issue`) จาก URL ใน `useEffect` ของหน้าสแกนสินค้า (`ScanPage`)
  - ทำให้เมื่อผู้ใช้กดปุ่ม **"รับเข้าสินค้า"** (`/scan?mode=receive`) หรือ **"เบิกออกสินค้า"** (`/scan?mode=issue`) จากส่วนเมนูด่วน (Quick Action) หน้า Dashboard ระบบจะเข้าสู่โหมดสแกนและเปิดกล้องสำหรับโหมดนั้นๆ ทันทีโดยไม่ต้องผ่านหน้าเลือกโหมดซ้ำ
  - คงความยืดหยุ่นด้วยปุ่ม **"เปลี่ยนโหมด"** บนหน้าสแกน ให้ผู้ใช้สามารถกดสลับโหมดหรือกลับสู่หน้าเลือกโหมดได้ตลอดเวลา

## 23 ก.ค. 2026
- **ย้ายตำแหน่งเมนู "แดชบอร์ด" ไปไว้ลำดับสุดท้ายบน Navigation Bar (`frontend/components/Navigation.tsx`)**:
  - สลับลำดับของเมนู **"แดชบอร์ด"** (`/dashboard`) ในแถบนำทางหลัก (`navItems`) ทั้งเมนูด้านบน (Desktop Header) และเมนูด้านล่าง (Mobile Bottom Tabs) ให้ไปแสดงผลเป็นลำดับสุดท้ายถัดจากเมนู "รายงาน"
- **สร้างหน้า Dashboard ใหม่สำหรับแสดงภาพรวมคลังวัตถุดิบบรรจุภัณฑ์เต็มรูปแบบ (`frontend/app/dashboard/page.tsx`)**:
  - พัฒนาส่วนประกอบ 4 KPI Metric Cards (รับเข้าวันนี้, เบิกออกวันนี้ [สีแดง `#BE1111`], รายการรอยืนยัน, วัตถุดิบทั้งหมด)
  - พัฒนากราฟสรุปการรับเข้า-เบิกออก 7 วันล่าสุด (Bar Chart) และกราฟสัดส่วนวัตถุดิบบรรจุภัณฑ์ (Donut Chart จำแนก แกลลอน, ฝา, ฟอยล์, กล่อง, ฉลาก)
  - พัฒนาส่วนเมนูด่วน (Quick Action) 4 ปุ่มทางด่วน และตารางรายการล่าสุด 5 รายการล่าสุด (Full Width)
  - เพิ่มเมนู **"แดชบอร์ด"** (`/dashboard`) ในแถบนำทางหลัก (`Navigation.tsx`) สไตล์ Apple Design สวยงาม มินิมอล 100%
- **อัปเดตบริบทระบบจาก "คลังสินค้า" เป็น "คลังวัตถุดิบ" ครอบคลุมทั่วทั้งเว็บแอป (`frontend`)**:
  - เปลี่ยนแปลงข้อความในหน้าเข้าสู่ระบบ (`login/page.tsx`), หน้าลงทะเบียน (`register/page.tsx`), หน้าสแกนสินค้า (`scan/page.tsx`), และหน้ารายการสต็อก (`inventory/page.tsx`)
  - กำหนดบริบทของระบบใหม่ให้สอดคล้องกับการใช้งานจริงในการรับเข้า-เบิกออกบรรจุภัณฑ์/วัตถุดิบ (เช่น แกลลอน, ฟอยล์, ฝา, กล่อง) ในคลังวัตถุดิบ
- **ยกเลิกการปรับเปลี่ยนชื่อเมนูบนแถบนำทาง กลับมาใช้คำเดิม "รายการ" (`frontend/components/Navigation.tsx`)**:
  - เปลี่ยนป้ายชื่อเมนูบน Navigation Bar กลับมาเป็นคำว่า **"รายการ"** ตามเดิมที่ผู้ใช้กำหนด
- **เอาไอคอนลูกศรออกจากป้ายประเภทการทำรายการ (`frontend/app/reports/page.tsx` & `frontend/app/transactions/page.tsx`)**:
  - ลบไอคอนลูกศร (`ArrowDownToLine` / `ArrowUpFromLine`) ออกจากป้ายประเภท **"รับเข้า"** และ **"เบิกออก"** 
  - จัดการแสดงผลตัวอักษรให้อยู่ตรงกลางป้ายอย่างเป็นระเบียบ เรียบร้อย มินิมอล ตรงตามความต้องการของผู้ใช้ 100%
- **ปรับเปลี่ยนสีป้าย "เบิกออก" ให้เป็นสีแดงตามธีมหลักของเว็บแอป (`#BE1111`) (`frontend/app/reports/page.tsx` & `frontend/app/transactions/page.tsx`)**:
  - เปลี่ยนสีป้ายประเภท **"เบิกออก"** จากโทนสีส้มเดิม ให้เป็นสีแดงแบรนด์หลักของแอป (`bg-red-50 text-[#BE1111] border-red-200/80`) ทั้งในหน้ารายงานธุรกรรมและหน้ารายการรอการยืนยัน
  - ทำให้ธีมสีของแอปพลิเคชันมีความเป็นเอกภาพและสวยงามลงตัว 100%
- **อัปเกรดดีไซน์และฟอนต์ในคอลัมน์ "ประเภท" และ "สถานะ" หน้ารายงานธุรกรรม (`frontend/app/reports/page.tsx`)**:
  - ปรับดีไซน์ป้ายประเภท (`รับเข้า` / `เบิกออก`) ให้ใส่ไอคอนลูกศรทิศทางมินิมอล (`ArrowDownToLine` / `ArrowUpFromLine`) พร้อมโทนสีนุ่มนวลซอฟต์ตามสเปกดีไซน์
  - ปรับดีไซน์ป้ายสถานะ (`ยืนยันแล้ว`, `ปฏิเสธแล้ว`, `รอการยืนยัน`) ให้ใช้เอฟเฟกต์สีโปร่งแสงแบบ Glassmorphic พร้อมเงาซอฟต์ `shadow-2xs`
  - กำหนดคลาส `font-display` ให้ป้ายทุกอันแสดงผลด้วยฟอนต์ **Plus Jakarta Sans + Prompt** เด่นชัด อ่านง่าย พรีเมียมสไตล์ Apple Design
- **บังคับใช้ชุดฟอนต์ Plus Jakarta Sans + Prompt ครอบคลุมทุกองค์ประกอบและทุกหน้าในระบบ (`frontend`)**:
  - เปลี่ยนคลาส `font-mono` ตกค้างทั้งหมดในหน้ารายงาน (`reports/page.tsx`), หน้ารายการรอการยืนยัน (`transactions/page.tsx`) และหน้าสแกนสินค้า (`scan/page.tsx`) มาเป็น `font-display`
  - ทำให้ตัวเลข วันที่ เวลา รหัสสินค้า และข้อความทั้งหมดแสดงผลด้วย **Plus Jakarta Sans** (สำหรับตัวเลข/ภาษาอังกฤษ) และ **Prompt** (สำหรับภาษาไทย) อย่างสม่ำเสมอสวยงามทั่วทั้งระบบ 100%
- **ปรับดีไซน์ป้ายหมายเหตุการปรับปรุงสต็อกแบบ 2 บรรทัดพร้อมไอคอนมินิมอล (`frontend/app/reports/page.tsx`)**:
  - พัฒนาฟังก์ชัน `parseStockAdjustNote` และเพิ่มคลาส `whitespace-nowrap` เพื่อแยกบรรทัดข้อความโดยอัตโนมัติ: บรรทัดแรกเป็นคำว่า **"ปรับปรุงสต็อก"** เรียงติดกันเป็นบรรทัดเดียวไม่ตัดคำ และบรรทัดล่างเป็นรายละเอียดวงเล็บ เช่น **"(เดิม 2 -> ใหม่ 1)"**
  - เปลี่ยนไอคอนประแจ (`Wrench`) เป็นไอคอนมินิมอล **`SlidersHorizontal`** สไตล์ Apple Design เรียบหรู สะอาดตา
- **ป้องกันข้อความในคอลัมน์ "ประเภท" ตัดบรรทัด (`frontend/app/reports/page.tsx`)**:
  - เพิ่มคลาส `whitespace-nowrap` ให้กับเซลล์ตาราง `<td>` และป้ายแสดงประเภท (`- เบิกออก` / `+ รับเข้า`) ทั้งหมด
  - ทำให้คำว่า **"- เบิกออก"** แสดงผลเรียงต่อกันเป็นบรรทัดเดียวกันอย่างสวยงาม ไม่ตกบรรทัด
- **เปลี่ยนข้อความประเภทธุรกรรมจาก "จ่ายออก" เป็น "เบิกออก" ทั่วทั้งระบบ (`frontend`)**:
  - เปลี่ยนข้อความป้ายประเภทในตารางหน้ารายงานธุรกรรม (`frontend/app/reports/page.tsx`) จาก `- จ่ายออก` เป็น `- เบิกออก`
  - เปลี่ยนข้อความป้ายประเภทในหน้ารายการรอการยืนยัน (`frontend/app/transactions/page.tsx`) จาก `จ่ายออก` เป็น `เบิกออก`
  - เปลี่ยนคำอธิบายในหน้าแรกและปุ่มกดยืนยันในหน้าสแกน (`frontend/app/page.tsx` และ `frontend/app/scan/page.tsx`) ให้ใช้คำว่า `เบิกออก` ทั้งหมด
- **เปลี่ยนชื่อหัวตารางรายงานธุรกรรมจาก "หมายเหตุ / รายละเอียด" เป็น "หมายเหตุ" (`frontend/app/reports/page.tsx`)**:
  - แก้ไขข้อความหัวตาราง `<th>` จากเดิม `หมายเหตุ / รายละเอียด` เปลี่ยนเป็น `หมายเหตุ` ให้กระชับ สั้น สวยงามตรงตามความต้องการของผู้ใช้
- **ปรับหัวตารางและข้อมูลตารางในหน้ารายงานธุรกรรมให้อยู่ตรงกลางกึ่งกลางทั้งหมด (`frontend/app/reports/page.tsx`)**:
  - กำหนดคลาส `text-center` ให้กับหัวตาราง (`<th>`) และเซลล์ข้อมูล (`<td>`) ทุกคอลัมน์ในตารางรายงานธุรกรรม (วันที่/เวลา, สินค้า, ประเภท, จำนวน, หมายเหตุ, สถานะ, ผู้ดำเนินการ)
  - ปรับการวางตำแหน่งเนื้อหาให้จัดวางอยู่กึ่งกลาง สมดุล อ่านง่าย และเป็นระเบียบสวยงาม 100%
- **ป้องกันข้อความในคอลัมน์ "สถานะ" ตัดบรรทัด (`frontend/app/reports/page.tsx`)**:
  - เพิ่มคลาส `whitespace-nowrap` ให้กับเซลล์ตาราง `<td>` และป้ายสถานะ (Badge) ทั้งหมดในคอลัมน์ "สถานะ"
  - ป้องกันคำว่า **"รอการยืนยัน"**, **"ยืนยันแล้ว"** และ **"ปฏิเสธแล้ว"** ตกบรรทัด ทำให้ข้อความแสดงผลเรียงต่อกันเป็นบรรทัดเดียวกันอย่างสวยงาม 100%
- **ปรับดีไซน์คอลัมน์ "หมายเหตุ / รายละเอียด" ให้อยู่ตรงกลางกึ่งกลางคอลัมน์ (`frontend/app/reports/page.tsx`)**:
  - กำหนดคลาส `text-center` ให้กับทั้งหัวตาราง `<th>` และเซลล์ข้อมูล `<td>` ในคอลัมน์ "หมายเหตุ / รายละเอียด"
  - ทำให้เครื่องหมายยัติภังค์ (`-`) และป้ายระบุหมายเหตุการทำธุรกรรมจัดวางอยู่ตรงกลางคอลัมน์อย่างสวยงามและสมดุล
- **แก้ไขข้อผิดพลาดไวยากรณ์ Syntax Error ในหน้าคำนวณและรายงานธุรกรรม (`frontend/app/reports/page.tsx`)**:
  - เติมวงเล็บปิด `)` ที่ขาดหายไปของคำสั่ง `return (...)` ในฟังก์ชัน `.map()` ของตารางรายงานธุรกรรม
  - ผ่านการตรวจสอบด้วย `npx tsc --noEmit` ผ่าน 100% (0 errors) สามารถ build และคอมไพล์ Turbopack ได้อย่างถูกต้อง
- **ปรับดีไซน์การจัดวางคอลัมน์ "วันที่ / เวลา" ให้อยู่ตรงกลางอย่างเป็นระเบียบ (`frontend/app/reports/page.tsx`)**:
  - แยกฟังก์ชันแปลงรูปแบบวันที่และเวลาออกเป็น 2 ส่วน (`dateStr` และ `timeStr`)
  - ปรับคอลัมน์ "วันที่ / เวลา" ในตารางรายงานธุรกรรมให้จัดวางอยู่ตรงกลาง (`text-center` และ `items-center`) โดยให้ **วันที่ (เช่น 21 ก.ค. 2569)** อยู่บรรทัดบน และ **เวลา (เช่น 14:30)** วางซ้อนตรงกลางด้านล่างอย่างสวยงาม สมดุล และอ่านง่าย
- **บังคับใช้สเปกฟอนต์ Plus Jakarta Sans + Prompt ครอบคลุมทุกคลาสและทุกหน้าเว็บรวมถึงหน้ารายงานธุรกรรม (`frontend/app/globals.css`)**:
  - กำหนดค่า CSS Utility Override ใน `@layer utilities` ครอบคลุมทั้ง `.font-display`, `.font-sans`, `.font-body`, `.font-mono` และ `body` ให้ใช้ฟอนต์ **Plus Jakarta Sans** (สำหรับภาษาอังกฤษ ตัวเลข และสัญลักษณ์) และ **Prompt** (สำหรับภาษาไทย) ร่วมกัน 100%
  - ทำให้ตัวเลข วันที่/เวลา, รหัสสินค้า, จำนวนธุรกรรม และข้อความทั้งหมดในหน้ารายงานธุรกรรม (Transactions Page) และทุกหน้าเว็บเปลี่ยนมาใช้ฟอนต์ **Plus Jakarta Sans + Prompt** สวยงาม เรียบหรู ตรงตามสเปกที่ผู้ใช้กำหนด
- **เพิ่มระบบซิงค์และ Fallback หน่วยนับ (uom/unit) อัตโนมัติจากตาราง `BillOfMaterial` ไปยังตาราง `Product` (`backend/src/index.ts`)**:
  - ตรวจสอบพบสาเหตุที่ผู้ใช้แก้ `uom` ในตาราง `BillOfMaterial` บน Supabase (เช่น จาก `M` เป็น `m`) แล้วบนหน้าเว็บแอปยังคงแสดงผลเป็น `M` เกิดจากหน้าการ์ดสินค้าดึงข้อมูลหน่วยจากคอลัมน์ `unit` ในตาราง `Product` ซึ่งเป็นคนละตารางกัน
  - พัฒนาระบบ Auto-sync ใน API `GET /products` และ `GET /products/:itemCode` โดยดึงค่า `uom` ล่าสุดจากตาราง `BillOfMaterial` มาใช้แสดงผลแทน `Product.unit` ของส่วนประกอบทันที พร้อมทำการส่งคำสั่งอัปเดตตาราง `Product.unit` ในฐานข้อมูล Supabase ให้ตรงกันโดยอัตโนมัติ
- **ปรับเปลี่ยนฟอนต์ของหน้ารายละเอียด BOM และทั้งหน้าเว็บ (`frontend/app/globals.css` และ `frontend/app/inventory/page.tsx`)**:
  - กำหนดค่า `--font-sans`, `--font-body` และ `--font-mono` ให้ใช้ **Plus Jakarta Sans** (สำหรับตัวอักษรภาษาอังกฤษ ตัวเลข และสัญลักษณ์) และ **Prompt** (สำหรับตัวอักษรภาษาไทย) เป็นฟอนต์หลักประจำแอป
  - ปรับการแสดงผลกล่องรหัสส่วนประกอบ (`c.componentItemCode`) ใน Modal BOM จากเดิมที่เป็นฟอนต์แบบ `font-mono` มาเป็น `font-display` เพื่อให้แสดงผลด้วย **Plus Jakarta Sans** สวยงาม เรียบหรู และอ่านง่าย ตรงตามรูปแบบที่ผู้ใช้ต้องการ
- **ปรับดีไซน์และฟอนต์ของรหัสสินค้าหลักใน Modal รายละเอียด BOM (/grill-me) (`frontend/app/inventory/page.tsx`)**:
  - ย้ายข้อความ `รหัสสินค้าหลัก: {displayParentCode}` ลงมาวางบรรทัดใหม่ด้านล่างป้าย `Bill of Materials (BOM)`
  - ปรับการแสดงผลและน้ำหนักฟอนต์ (`font-bold tracking-tight`) ให้ตรงกับชื่อสินค้าหลัก 100% โดยใช้ฟอนต์ **Plus Jakarta Sans** (สำหรับตัวอังกฤษ/ตัวเลข) คู่กับ **Prompt** (สำหรับภาษาไทย) ผ่านคลาส `font-display`
- **นำไอคอนมงกุฎออกจากป้ายส่วนหัว Modal รายละเอียด BOM (`frontend/app/inventory/page.tsx`)**:
  - เปลี่ยนจาก `👑 SAP Bill of Materials (BOM) Recipe` เป็น `Bill of Materials (BOM)` (นำข้อความ SAP, Recipe และไอคอน 👑 ออกทั้งหมด)

## 22 ก.ค. 2026
- **แก้ไขป๊อปอัป BOM ให้ดึงสูตรของสินค้าหลักเพียง 1 รายการ และแสดงข้อมูลครบทั้ง 13 แถวตรงตามไฟล์ Excel 100% (/grill-me) (`backend/src/index.ts` และ `frontend/app/inventory/page.tsx`)**:
  - แก้ไข API ใน Backend ให้ใช้ `take: 1` ดึงสูตร BOM ของสินค้าหลักเพียงรายการเดียว เพื่อป้องกันการดึงสูตรของสินค้าหลักหลายรายการมารวมกันจนเกิดแถวเกิน/ซ้ำซ้อน
  - ยกเลิก Filter ตัวกรองแถวแรก (`componentItemCode !== parentItemCode`) ออก ทำให้แถวแรก (รหัสสินค้าหลัก `60230073C506E`) แสดงผลครบถ้วน 13 แถวตรงตามภาพถ่ายไฟล์ Excel 100%
- **จัดเรียงรายการส่วนประกอบในป๊อปอัป BOM ตามลำดับแถวเดิมในตาราง `BillofMaterial` (orderBy: id ASC) (/grill-me) (`backend/src/index.ts` และ `frontend/app/inventory/page.tsx`)**:
  - กำหนดเงื่อนไข `orderBy` ใน API `GET /products/:itemCode/bom` ให้เรียงตามลำดับแถวเดิมในตาราง `BillOfMaterial` (เรียงตาม `id: 'asc'`)
  - แสดงผลแต่ละแถวด้วยคอลัมน์ `componentItemCode` (ฝั่งซ้าย) และ `description` (ฝั่งขวา) เรียงตามลำดับเดียวกับในตาราง Excel/Supabase 100%
- **นำตัวเลขปริมาณใช้และหน่วยนับออกจากหน้าต่างป๊อปอัป "ดูรายละเอียด BOM" (`frontend/app/inventory/page.tsx`)**:
- **นำตัวเลขปริมาณใช้และหน่วยนับออกจากหน้าต่างป๊อปอัป "ดูรายละเอียด BOM" (`frontend/app/inventory/page.tsx`)**:
  - ลบองค์ประกอบแสดงตัวเลขปริมาณและหน่วยนับ (เช่น `1 Drum200L`, `209 Litre`, `0.016 m`) ออกจากฝั่งขวาของการ์ดรายการส่วนประกอบในป๊อปอัป BOM
  - คงไว้เฉพาะป้ายระบุชื่อคลังจัดเก็บ (`คลัง: WPK`, `คลัง: WFG-INT` ฯลฯ) เพื่อให้ป๊อปอัปเน้นแสดงผลเฉพาะข้อมูลรายการส่วนประกอบอย่างเรียบง่าย สะอาดตา
- **ปรับปรุงรูปแบบหน้าต่างป๊อปอัป "ดูรายละเอียด BOM" แสดงรหัสสินค้าหลัก (parentItemCode) ในส่วนหัว และแสดงส่วนประกอบแบบไม่แบ่งหมวดหมู่ (/grill-me) (`frontend/app/inventory/page.tsx`)**:
  - ปรับส่วนหัวของป๊อปอัป (Header) ให้แสดง **รหัสสินค้าหลัก (`parentItemCode`)** และชื่อสินค้าหลักอย่างชัดเจน (เช่น `รหัสสินค้าหลัก: 90793-10001` เป็นต้น)
  - ยกเลิกการแยกหมวดหมู่ออกเป็น Bulk / Packaging / Raw Material ตามข้อสรุปจากการสัมภาษณ์ `/grill-me`
  - เปลี่ยนการแสดงผลรายการส่วนประกอบมาเป็นแบบรายการเรียงแถวตรง (Flat List) อ่านง่าย ชัดเจน และไม่มีไอคอนหรือปุ่ม QR Code รบกวน
- **แก้ไขปัญหากด "ดูรายละเอียด BOM" บนสินค้าส่วนประกอบ (Packaging/Bulk) แล้วขึ้นว่าไม่พบข้อมูล (`backend/src/index.ts` และ `frontend/app/inventory/page.tsx`)**:
  - ตรวจสอบพบสาเหตุเกิดจากสินค้าบรรจุภัณฑ์ (เช่น `3510192050`) มีสถานะเป็นสินค้าส่วนประกอบ (`componentItemCode`) ในสูตร BOM ไม่ใช่สินค้าหลัก (`parentItemCode`) ทำให้คำสั่งดึงสูตรแบบตรงตัวเดิมคืนค่า 0 รายการ
  - อัปเดต API `GET /products/:itemCode/bom` ใน Backend ให้ทำการสืบค้นย้อนกลับหา `parentItemCode` ที่ใช้ชิ้นส่วนนี้ และดึงสูตร BOM ของสินค้าหลักนั้นมาแสดงผลอัตโนมัติ
  - เพิ่มระบบ Fallback ใน `openBomModal` ฝั่ง Frontend ให้ค้นหาสูตร BOM จาก `product.parentItemCodes` สำรองทันที ทำให้การกด "ดูรายละเอียด BOM" ของสินค้าบรรจุภัณฑ์และส่วนประกอบแสดงรายละเอียดสูตร BOM ได้ถูกต้อง 100%
- **ปรับปรุงรูปแบบหน้าต่างป๊อปอัป "ดูรายละเอียด BOM" ให้แสดงเฉพาะข้อมูลรายละเอียดส่วนประกอบโดยไม่มี QR Code (/grill-me) (`frontend/app/inventory/page.tsx`)**:
  - เปลี่ยนจากตารางเดิมที่เคยมีปุ่มและไอคอน QR Code บนคอลัมน์รหัสส่วนประกอบ มาเป็นการแสดงผลการ์ดรายละเอียดข้อมูลที่อ่านง่าย สะอาดตา และเน้นเฉพาะข้อมูลส่วนประกอบเท่านั้น
  - เพิ่มฟังก์ชัน `getBomComponentGroup` ในการจัดหมวดหมู่ชิ้นส่วนสูตร BOM ออกเป็น 3 หมวดชัดเจน: 1. **Bulk (สารผสม/กึ่งสำเร็จรูป)** 2. **Packaging (บรรจุภัณฑ์)** 3. **Raw Material (วัตถุดิบ)**
  - แสดงผลเปิดขยายครบทั้ง 3 หมวดหมู่พร้อมกันโดยไม่ต้องกดคลิกยุบ-ขยาย ตามข้อสรุปจากการสัมภาษณ์ `/grill-me`
- **ปรับปรุงดีไซน์กล่อง "STOCK คงเหลือ" จัดวางตัวเลขให้อยู่ตรงกลางและย้ายหน่วยนับไว้ด้านล่าง (`frontend/app/inventory/page.tsx`)**:
  - เปลี่ยนรูปแบบการวางตัวเลขจำนวนคงเหลือและหน่วยนับจากการวางต่อกันแนวนอน (ซึ่งทำให้ตัวเลขยาวขยับเบี้ยวไปทางซ้าย) เปลี่ยนมาใช้การวางแนวตั้งซ้อนกัน 3 บรรทัด (1. STOCK คงเหลือ -> 2. ตัวเลขจำนวนขนาดใหญ่ -> 3. หน่วยนับตรงกลาง)
  - ทำให้ตัวเลขจำนวนคงเหลือ (เช่น 6) แสดงผลตรงกลางกล่องอย่างสมบูรณ์แบบทั้งการ์ด FG และ Packaging
- **นำป้ายข้อความ "Packaging" บนการ์ดสินค้าออก (`frontend/app/inventory/page.tsx`)**:
  - ลบองค์ประกอบป้าย Badge สีเทาขอบมน (`<span ...>Packaging</span>`) ที่แสดงด้านบนชื่อรายการสินค้าบนการ์ดสินค้าในหน้าคลังสินค้า (Inventory Page) เพื่อให้การ์ดดูสะอาดตา เรียบง่าย และตรงตามความต้องการของผู้ใช้
- **แก้ไขข้อผิดพลาดการเชื่อมต่อ Backend ในหน้า Login ("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Backend ได้ กรุณาตรวจสอบการเปิดใช้งานระบบ") (`backend/src/index.ts`)**:
  - ตรวจสอบพบสาเหตุเกิดจากไฟล์ `backend/src/index.ts` มี Syntax Error (โค้ดผิดพลาดจากการพิมพ์ขาดตกในเส้นทาง `/products`) ส่งผลให้เมื่อรัน `npm run dev` ตัวโปรเซสของ Backend (`ts-node-dev`) ล้มเหลวและปิดตัวลงทันที ไม่สามารถเปิด listening on port 4000 ได้
  - ดำเนินการแก้ไขไวยากรณ์ TypeScript ใน `backend/src/index.ts` คืนค่าให้ถูกต้อง และผ่านการตรวจสอบด้วย `npx tsc --noEmit` ได้ผลลัพธ์ผ่าน 100% (0 errors)
  - ทดสอบรัน Backend สตาร์ททำงานปกติที่พอร์ต 4000 พร้อมใช้งานร่วมกับ Frontend หน้าล็อกอิน

## 21 ก.ค. 2026
- **ปรับปรุงหน้าสแกนโดยนำโหมด "ดูสต็อกคงเหลือ (View Stock)" ออก (`frontend/app/scan/page.tsx`)**:
  - นำปุ่มตัวเลือก "ดูสต็อกคงเหลือ" ออกจากหน้าแรกของการเลือกโหมดการสแกน เพื่อปรับโฟกัสของหน้าสแกนสินค้าให้เน้นธุรกรรมการรับเข้าและเบิกออก (Receive/Issue) สำหรับคลัง WPK เท่านั้น เนื่องจากระบบมีหน้าตรวจสอบสต็อกสินค้าแยกไว้ต่างหากอยู่แล้ว
  - ปรับปรุง Type ของ `scanMode` State และส่วนของการแสดงผลสถานะโหมดใช้งาน (Active Mode Header) รวมถึงล้างโครงสร้างเงื่อนไข Ternary ในส่วนประมวลผลฟอร์มธุรกรรมที่เกี่ยวข้องกับโหมดดูสต็อกออกไปทั้งหมดเพื่อความสะอาดและกระชับของโค้ด
- **พัฒนาปรับปรุงระบบแยกบทบาทการใช้งาน (Role Separation) ระหว่าง Supervisor และ พนักงานทั่วไป**:
  - ปรับข้อมูลการสร้างบัญชีตั้งต้น (Database Seed) สำหรับระดับหัวหน้างานใหม่ โดยปรับเปลี่ยนจาก Username `admin` (รหัสผ่าน `admin123`) ไปเป็น **Username `supervisor`** และ **Password `super1234`** (ระดับสิทธิ์ `admin`) และอัปเดตสิทธิ์ Fast-path ล็อกอิน
  - พัฒนาระบบแสดงผล Role บนส่วนหัวหน้า Dashboard และ Navbar ให้แสดงผลเข้าใจง่ายขึ้น: บทบาท `admin` แปลผลเป็น **Supervisor** และบทบาท `warehouse_staff` แปลผลเป็น **พนักงานทั่วไป**
  - ปรับปรุงสิทธิ์การเข้าใช้งานหน้ารายการอนุมัติ (`frontend/app/transactions/page.tsx`): ซ่อนปุ่ม อนุมัติ (Confirm) และปฏิเสธ (Reject) ทั้งหมดสำหรับบัญชีพนักงานทั่วไป โดยจะแสดงเป็นป้ายสีเหลืองแจ้งเตือน `รอการอนุมัติจาก Supervisor` แทน
  - ปรับปรุงสิทธิ์การเข้าใช้งานหน้าสต็อกสินค้า (`frontend/app/inventory/page.tsx`): จำกัดสิทธิ์บัญชีพนักงานทั่วไปให้เป็นแบบ **ดูได้อย่างเดียว (Read-Only)** โดยการซ่อนช่อง Input ปรับสต็อก (เปลี่ยนเป็น Text แสดงยอด) ซ่อนปุ่ม "จัดการ" (ลบสินค้า) ในทุกตารางของระบบ
- **เพิ่มระบบดึงข้อมูลอัตโนมัติ (Auto-Polling) ในหน้าตรวจสอบรายการอนุมัติ (`frontend/app/transactions/page.tsx`)**:
  - พัฒนาระบบ Background Fetch ให้ดึงข้อมูลรายการอัปเดตแบบเบื้องหลัง (Silent Fetch) ทุกๆ 5 วินาที
  - ลดภาระการกดรีเฟรชหน้าจอของฝั่ง Supervisor (ทำให้การทำงานเสมือนแบบ Real-time) พร้อมติดตั้งระบบจัดการข้อผิดพลาดเบื้องหลัง (Silent Error Handling) และ Cleanup (`clearInterval`) เพื่อป้องกันปัญหาหน่วยความจำสะสม
- **เพิ่มป้ายแสดงพื้นที่ปฏิบัติงานและข้อจำกัดของแบรนด์สินค้าในส่วนหัวของหน้าสแกน (`frontend/app/scan/page.tsx`)**:
  - เพิ่ม Badge กล่องข้อความสีแดงอ่อนมีขอบมนระบุข้อความ `พื้นที่ปฏิบัติงาน: คลัง WPK • เฉพาะสินค้า Yamalube เท่านั้น` พร้อมจุดไฟสถานะสีแดงกระพริบ (Pulse animation) ด้านล่างข้อความต้อนรับของหน้าสแกน เพื่อเตือนสติผู้ใช้ถึงเงื่อนไขการปฏิบัติงานคลังและยี่ห้อสินค้าเป้าหมายทันทีที่เข้าหน้านี้

## 20 ก.ค. 2026
- **เพิ่มการแสดงรายการ Packaging ย่อยบนฟอร์มหน้าสแกนโดยตรง (`frontend/app/scan/page.tsx`)**:
  - พัฒนาให้เมื่อผู้ใช้สแกนสินค้าหลักที่ไม่ใช่บรรจุภัณฑ์ (เช่นสินค้าสำเร็จรูป FG) ตัวฟอร์มหน้าสแกนหลักจะแสดงรายการส่วนประกอบเฉพาะที่เป็น **Packaging (บรรจุภัณฑ์)** ขึ้นมาให้คลิกเลือกทำรายการต่อได้โดยตรงทันที ใต้กล่องข้อความแจ้งเตือน "ไม่อนุญาตให้ทำรายการ" เพื่อความสะดวก รวดเร็ว และไม่ต้องกดเปิด Pop-up ก่อน
  - ปรับปรุงดีไซน์การ์ดรายการ Packaging บนหน้าสแกนหลักนี้ให้ใช้ **รูปแบบการแสดงผลแบบเดียวกับในการ์ด BOM ใน Pop-up (รูปที่ 1)** (เช่น กล่องรหัสสีแดงอ่อน มีเส้นขอบ ข้อมูลปริมาณ/หน่วย พร้อมไอคอนลูกศรชี้ออก และ Effect Hover) เพื่อคงความเป็นอันหนึ่งอันเดียวกันของดีไซน์ในหน้าสแกน
  - ย้ายตำแหน่ง **กล่องข้อความแจ้งเตือนสีเหลือง "ไม่อนุญาตให้ทำรายการ" ไปอยู่ด้านล่างสุด** (ถัดจากรายการชิ้นส่วน Packaging) ทำให้เมื่อสแกนสินค้าหลักเข้ามาผู้ใช้สามารถมองเห็นและกดเลือกชิ้นส่วน Packaging ได้ก่อนทันที แล้วจึงมีคำแจ้งเตือนตบท้ายตามความต้องการของผู้ใช้
  - ในขณะที่ปุ่ม **"ดูรายละเอียด BOM"** จะยังคงทำหน้าที่เปิด Pop-up แสดงรายละเอียดสูตร BOM ทั้งหมดทุกหมวดหมู่ (Bulk, Packaging, Raw Material) ตามปกติเมื่อกดเปิด

- **ปรับปรุงปุ่มและหน้าต่างแสดงรายละเอียด BOM ในหน้าสแกน (`frontend/app/scan/page.tsx`)**:
  - ปรับเปลี่ยนดีไซน์ปุ่มสูตรการผลิต (BOM) ในหน้าสแกนสินค้าให้เป็นแบบสีแดงทึบพรีเมียม พร้อมชื่อปุ่ม "ดูรายละเอียด BOM" ให้สอดคล้องกับดีไซน์บนหน้าคลังสินค้า/สต็อก (Inventory)
  - เปลี่ยนรูปแบบการแสดงผลจากการขยายด้านล่าง (Accordion) ให้กลายเป็นหน้าต่าง Pop-up Modal ซ้อนทับกลางหน้าจอ (Overlay) พร้อมแอนิเมชันของ Framer Motion
  - แสดงผลสูตร BOM ด้านใน Modal แยกตามกลุ่มการ์ดแบ่งหมวดหมู่ (Bulk, Packaging, Raw Material) ตามดีไซน์รูปที่ 1 โดยปลดล็อกให้ชิ้นส่วนสินค้าทุกประเภท (รวมถึง Bulk และ Raw Material) สามารถคลิกสลับรายการสินค้าหลักในหน้าสแกนได้เหมือนกับ Packaging เพื่อความสะดวกในการดูรายละเอียด
  - ควบคุมสิทธิ์ทำรายการที่ระดับฟอร์มและปุ่ม: กำหนดให้ผู้ใช้สามารถทำรายการรับเข้า เบิกออก และดูสต็อกคงเหลือได้เฉพาะสินค้าประเภท **Packaging** ที่ถูกจัดเก็บอยู่ในคลัง **WPK** เท่านั้น
  - ในกรณีที่สินค้าเป็นบรรจุภัณฑ์ (Packaging) แต่ไม่ได้จัดเก็บในคลัง WPK ระบบจะบล็อกการทำรายการและแสดงกล่องข้อความแจ้งเตือน "ไม่อนุญาตให้ทำรายการ: บรรจุภัณฑ์รายการนี้ไม่ได้จัดเก็บในคลัง WPK (คลังปัจจุบัน: ...)" เพื่อความชัดเจนและป้องกันความผิดพลาดในการทำรายการข้ามคลังสินค้า
  - เพิ่มความปลอดภัยในระดับ Logic ในฟังก์ชัน `submitTransaction` เพื่อสกัดกั้นการบันทึกรายการหากไม่ผ่านเกณฑ์ทั้งสองข้อข้างต้น

- **ปรับเปลี่ยนดีไซน์และไอคอนบนเมนูนำทาง (`frontend/components/Navigation.tsx`)**:
  - เปลี่ยนสัญลักษณ์ (Icon) สำหรับปุ่มเมนู "หน้าหลัก" จากไอคอน `LayoutDashboard` (สี่เหลี่ยมสี่ช่อง) ไปเป็นไอคอนรูปบ้าน `Home` จากชุดไอคอน Lucide React เพื่อให้ตรงกับโครงสร้างแบบรูปที่ 2
  - เพิ่มไอคอนโลโก้ **Package สีแดงสด** วางประกบคู่หน้าชื่อระบบ **QR Webapp** ในส่วนของแถบเมนูหลักด้านบน (Desktop Header) เพื่อเพิ่มความพรีเมียมและอัตลักษณ์แบรนด์ให้สอดคล้องกับภาพถ่ายของระบบในรูปที่ 2

- **ติดตั้งและตั้งค่าระบบทดสอบโค้ด (Testing Frameworks) ในฝั่ง Frontend (`frontend/vitest.config.ts`, `frontend/playwright.config.ts`, `frontend/package.json`)**:
  - ติดตั้ง **Vitest** (`vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`) สำหรับทำ Unit Test เพื่อตรวจสอบความถูกต้องของฟังก์ชันแต่ละส่วนแบบแยกอิสระ โดยได้เพิ่มไฟล์ตัวอย่างการเทสต์ไว้ที่ `frontend/__tests__/unit/sample.test.ts`
  - ติดตั้ง **Playwright** (`@playwright/test`) สำหรับทำ E2E Test (End-to-End) เพื่อจำลองการคลิกและพิมพ์เหมือนผู้ใช้งานจริงผ่านบราวเซอร์ (Chromium) โดยได้เพิ่มไฟล์ตัวอย่างการเทสต์หน้าล็อกอินไว้ที่ `frontend/__tests__/e2e/login.spec.ts`
  - เพิ่มชุดคำสั่ง Scripts ลงใน `package.json` สำหรับรันเทสต์อย่างสะดวกรวดเร็ว ได้แก่ `npm run test` (สำหรับรัน Unit Test) และ `npm run test:e2e` (สำหรับรัน E2E Test)

- **เพิ่มการแสดงผลหน่วย (Unit/Uom) ในช่องกรอกจำนวนบนหน้าสแกน (`frontend/app/scan/page.tsx`)**:
  - อัปเดต UI ของช่องกรอกจำนวนในหน้าสแกนรับเข้า/จ่ายออกสินค้า โดยเพิ่มการแสดงผลหน่วย (เช่น PCS, กก., ลิตร) ไว้ที่ด้านท้ายของช่องกรอก (Input suffix) เพื่อให้ผู้ใช้งานทราบได้อย่างชัดเจนว่ากำลังทำรายการเพิ่ม/ลดสต็อกในหน่วยใด ซึ่งช่วยลดข้อผิดพลาดจากการสับสนหน่วยในการทำธุรกรรม โดยข้อมูลหน่วยนี้ครอบคลุมทั้งหน่วยจาก `Product.unit` (สินค้าหลัก) และ `BillOfMaterial.uom` (ส่วนประกอบในสูตร) ที่ถูกดึงมาอัตโนมัติ

- **ปรับปรุงโครงสร้างและหน้าตาของหน้าสแกน (Scan Page Redesign) (`frontend/app/scan/page.tsx`)**:
  - เปลี่ยนแปลงพฤติกรรมการใช้งานในหน้าจอหลัก โดยผู้ใช้จะต้องเลือกโหมดการทำงานก่อน (รับเข้า / เบิกออก / ดูสต็อก) แล้วกล้องจึงจะเปิดให้ทำการสแกน QR Code
  - **โหมดรับเข้า / เบิกออก**: แบบฟอร์มทำรายการจะล็อกการกระทำตามโหมดที่เลือกไว้ตั้งแต่ต้น โดยซ่อนปุ่มสลับประเภทรายการ และเปลี่ยนสีปุ่มบันทึกเป็นสีเขียว/แดง ตามความเหมาะสม ช่วยป้องกันการเผลอกดสลับรับเข้า-เบิกออกผิดประเภท
  - **โหมดดูสต็อก (View Stock)**: จะซ่อนฟอร์มทำรายการทั้งหมด แสดงเพียงจำนวนคงเหลือของสินค้าและรายการสูตรการผลิต (BOM) ป้องกันการบันทึกรายการซ้ำซ้อน
  - ปรับปรุงข้อจำกัดการทำรายการ: สินค้าหลัก (Finished Goods) และรายการส่วนประกอบประเภทวัตถุดิบ (Raw Material) / กึ่งสำเร็จรูป (Bulk) จะไม่สามารถกดบันทึกรายการได้ ผู้ใช้สามารถเลือกกดเจาะจงทำรายการได้เฉพาะกับ **Packaging (บรรจุภัณฑ์)** เท่านั้น หากสแกน FG หรือเลือกหมวดอื่นๆ ระบบจะแสดงแจ้งเตือนว่า ไม่อนุญาตให้ทำรายการ

## 17 ก.ค. 2026
- **ปรับปรุงระบบเข้าสู่ระบบ `POST /auth/login` ให้รองรับการค้นหาชื่อบัญชีแบบ Case-Insensitive และแยกประเภท Error เชื่อมต่อฐานข้อมูล (`backend/src/index.ts`)**:
  - เปลี่ยนการค้นหาชื่อบัญชีผู้ใช้จาก `findUnique` เป็น `findFirst` พร้อมตั้งค่า `mode: 'insensitive'` เพื่อไม่ให้เกิดปัญหาเมื่อผู้ใช้งานพิมพ์ชื่อตัวพิมพ์เล็ก-ใหญ่ไม่ตรงกับที่บันทึกไว้ในระบบ
  - แยกจัดการข้อผิดพลาดในการตรวจสอบผู้ใช้ โดยหากเกิดปัญหาไม่สามารถเชื่อมต่อฐานข้อมูลได้ (`catch`) ระบบจะส่ง Error 500 ตามจริงแทนที่จะแจ้งเตือนว่า "ไม่พบบัญชีผู้ใช้" เพื่อลดความสับสนและให้ข้อความ Error สื่อความหมายถูกต้อง
- **แก้ไขปัญหาระบบ Backend บน Render ตอบกลับ `500 Internal Server Error` ทุกคำขอและเพิ่มระบบตรวจสอบการเชื่อมต่อฐานข้อมูล (`backend/package.json` และ `backend/src/index.ts`)**:
  - เพิ่มระบบทำความสะอาดตัวแปรสภาพแวดล้อม (`DATABASE_URL` และ `DIRECT_URL`) แบบอัตโนมัติเมื่อเริ่มต้นทำงาน ในไฟล์ `backend/src/index.ts` โดยทำการตัดเครื่องหมายคำพูด (Quote `"` หรือ `'`) หรือช่องว่างเว้นวรรคที่ผู้ใช้อาจเผลอคัดลอกมาวางในช่อง Environment Variables ของ Render Dashboard ออกโดยอัตโนมัติ เพื่อป้องกันข้อผิดพลาด `the URL must start with the protocol postgresql://` จาก Prisma
  - ปรับปรุงสคริปต์ `build` ใน `backend/package.json` จาก `"tsc"` ให้เป็น `"prisma generate && tsc"` เพื่อรับประกันว่าทุกครั้งที่ระบบ Render ทำการ Build และอัปเดตเซิร์ฟเวอร์ ตัว Prisma Client จะได้รับการสร้างโครงสร้าง (Schema Definitions) ล่าสุดและสามารถเชื่อมต่อกับฐานข้อมูล Supabase PostgreSQL บน Production ได้อย่างถูกต้อง ไม่เกิด Error 500 จาก Client ไม่ตรงกับฐานข้อมูล
  - เพิ่ม API Route `/health/db` สำหรับการตรวจสอบสถานะและการเชื่อมต่อระหว่างเซิร์ฟเวอร์ Render กับฐานข้อมูล Supabase (`DATABASE_URL`) ในขณะรันจริง หากเกิดปัญหาการเชื่อมต่อ ตัว API จะแจ้งสถานะและข้อความข้อผิดพลาดออกมาอย่างละเอียด เพื่อช่วยในการวิเคราะห์ปัญหาสภาพแวดล้อมได้ทันที
- **แก้ไขข้อผิดพลาด `500 Internal Server Error` ขณะสแกน QR Code เพื่อดึงข้อมูลสินค้าผ่านมือถือ (`backend/src/index.ts`)**:
  - ปรับปรุง API `GET /products/:itemCode` และ `GET /products/:itemCode/bom` โดยเปลี่ยนจากคำสั่ง `prisma.product.findUnique({ where: { itemCode } })` ซึ่งเรียกร้องเงื่อนไข Unique Constraint และ Case-Sensitive จากฐานข้อมูลจนเกิด Exception บน Production มาเป็น `prisma.product.findFirst(...)` พร้อมระบบกรองคำค้นแบบ Case-Insensitive (`equals: rawCode, mode: 'insensitive'`) และตัดช่องว่าง (`trim()`)
  - ยกเลิกการตรวจสอบเงื่อนไข `!bomExists` ร่วมกับการค้นหาสินค้าหลัก (`findUnique`) เพื่อให้ผู้ใช้สามารถสแกนบาร์โค้ดดึงรายละเอียดและทำรายการธุรกรรม (รับเข้า/จ่ายออก) ของสินค้ารหัสใดๆ ที่มีในคลังได้ทันทีโดยไม่เกิด Error 500 ล้มเหลว
- **ปรับปรุงระบบเชื่อมต่อข้ามโดเมน (CORS) และจัดการ URL ป้องกันข้อผิดพลาดในการ Deploy บน Vercel และ Render (`backend/src/index.ts` และ `frontend/lib/auth.ts`)**:
  - **ฝั่ง Backend (`backend/src/index.ts`)**: อัปเกรด CORS middleware ให้ตรวจสอบและอนุญาตโดเมนจาก `vercel.app` และ `localhost` โดยอัตโนมัติ พร้อมตัดเครื่องหมายสแลชปิดท้าย (`/`) ออกจาก Origin ก่อนเปรียบเทียบ เพื่อป้องกันปัญหา Preflight Option Request ล้มเหลวจากการตั้งค่า Environment Variable ไม่ตรงกันหรือมีสแลชเกิน
  - **ฝั่ง Frontend (`frontend/lib/auth.ts`)**: เพิ่มระบบตัดเครื่องหมายสแลชปิดท้ายออกจากตัวแปร `NEXT_PUBLIC_API_URL` ก่อนนำไปต่อกับ path ของ API เพื่อป้องกันปัญหา URL ซ้ำซ้อน (`//auth/login`) ที่อาจทำให้ Express หรือ Reverse Proxy บน Render ตอบกลับผิดพลาด และได้ลบข้อความระบุ `(พอร์ต 4000)` ออกจากหน้าแจ้งเตือน Error

## 15 ก.ค. 2026
- **เพิ่มคำสั่ง build ใน Root package.json (`package.json`)**: เพื่อแก้ไขปัญหา Error `Missing script: "build"` เมื่อรันจากโฟลเดอร์หลัก โดยเพิ่มสคริปต์สำหรับการ build:
  - `npm run build:backend`: สั่ง build โฟลเดอร์ `backend` (`tsc`)
  - `npm run build:frontend`: สั่ง build โฟลเดอร์ `frontend` (`next build`)
  - `npm run build`: สั่ง build ทั้ง backend และ frontend พร้อมกันอย่างเป็นลำดับขั้นตอน
- **แก้ไขไวยากรณ์ JSON ใน `backend/package.json`**: เพิ่มเครื่องหมายจุลภาค `,` หลังวงเล็บปีกกาปิด `}` ของส่วน `"scripts"` เพื่อแก้ไขปัญหา `EJSONPARSE` ที่เกิดจากโครงสร้าง JSON ไม่ถูกต้อง ทำให้ตัวแอปสามารถอ่านไฟล์และรันคำสั่ง build ได้ตามปกติ
- **แก้ไขปัญหา TypeScript Type Error ใน `frontend/app/page.tsx`**: เพิ่ม `as const` ที่การกำหนดค่า `type: 'spring'` ในตัวแปร `itemVariants` ของ Framer Motion เพื่อป้องกันปัญหา Type Widening (การขยายชนิดข้อมูลเป็น string ทั่วไปแทนที่จะเป็นลิเทอรัลเฉพาะ) ซึ่งช่วยให้รันคำสั่ง build ของ Next.js ผ่านได้อย่างถูกต้อง
- **ปรับปรุงการแสดงผลในหน้าสต็อกสินค้า โดยจำแนกหมวดหมู่ย่อย Packaging ออกเป็น 5 ประเภทตามหลักเกณฑ์ (/grill-me) (`frontend/app/inventory/page.tsx`)**:
  - ผ่านกระบวนการสัมภาษณ์ความต้องการ `/grill-me` เพื่อสรุปดีไซน์และรูปแบบของตัวกรองย่อย โดยได้เลือกเพิ่ม **แถบแท็กย่อย (Sub-Category Pill Tabs - [ทั้งหมด], [แกลลอน], [ฟอยล์], [ฝา], [กล่อง], [อื่นๆ])** สีมินิมอลแบบ Apple-style วางไว้ด้านล่างของตัวกรองหมวดหมู่หลักเมื่อผู้ใช้กดที่แท็บ Packaging
  - พัฒนาฟังก์ชันตัวช่วยคัดกรอง `getPackagingSubCategory` สำหรับจำแนกประเภทชิ้นส่วนบรรจุภัณฑ์ในกลุ่ม Packaging แบบอัตโนมัติตามหลักเกณฑ์:
    1. **อื่นๆ (Others - `other`)**: ให้ความสำคัญกับฉลากสินค้า (`Label`, `Sticker`, `ฉลาก`) และสายรัดกล่อง (`Strap`, `สายรัด`, `รัดกล่อง`) ก่อนเป็นอันดับแรก
    2. **แกลลอน (Gallon - `gallon`)**: สำหรับชิ้นส่วนที่มีคำว่า `Gallon`, `Pail`, `Drum`, `Can`, `ถัง`, `ขวด`, `แกลลอน` (และ UOM ที่เกี่ยวข้อง)
    3. **ฟอยล์ (Foil - `foil`)**: สำหรับชิ้นส่วนที่มีคำว่า `Foil`, `Film`, `Seal`, `Shrink`, `ฟอยล์`, `ซีล`, `ฟิล์ม`
    4. **ฝา (Cap - `cap`)**: สำหรับชิ้นส่วนที่มีคำว่า `Cap`, `Lid`, `ฝา`
    5. **กล่อง (Box - `box`)**: สำหรับชิ้นส่วนที่มีคำว่า `Box`, `Carton`, `กล่อง`, `ลัง`
  - ตามเงื่อนไขผลลัพธ์ของ `/grill-me` ตัวกรองกลุ่มย่อยของ Packaging นี้ **จะคัดกรองและนับจำนวนเฉพาะตารางสรุปหลักของ Packaging เท่านั้น** ในส่วนของตารางสินค้าทั่วไป (Unassigned Items) และตาราง Flat List (แยกรายการ) จะยังคงแสดงสินค้าบรรจุภัณฑ์ทั้งหมดตามปกติโดยไม่ผ่านตัวกรองย่อย เพื่อความคล่องตัวในการดูภาพรวม
  - ปรับระบบซิงค์และล้างตัวกรองย่อยอัตโนมัติเมื่อกดสลับแท็บหลัก หรือล้างคำค้นหา
- **ปรับปรุงดีไซน์ตารางสูตร SAP BOM และหน้ารายละเอียดเพื่อไม่ให้ข้อมูลรหัสหรือข้อความในคอลัมน์ตัดขึ้นบรรทัดใหม่ (`frontend/app/inventory/page.tsx` และ `frontend/app/scan/page.tsx`)**:
  - เพิ่มการจัดรูปแบบ CSS ด้วยคลาส `whitespace-nowrap` ให้กับหัวตาราง (`<th>`) และเซลล์ในตาราง (`<td>`) ในส่วนของคอลัมน์หลักต่างๆ (ได้แก่ Depth, รหัสส่วนประกอบ, ปริมาณใช้, หน่วย, คลัง) ของ Modal ตารางสูตร BOM ในหน้าจัดการสต็อก (`inventory/page.tsx`) ทำให้รหัสส่วนประกอบที่มีเครื่องหมายขีด (เช่น `I-NIPPO063013`) และตัวเลขปริมาณ รวมถึงหน่วยนับ แสดงผลอยู่ภายในบรรทัดเดียวกันทั้งหมด ไม่เกิดการตัดคำขึ้นบรรทัดใหม่ที่ดูไม่เป็นระเบียบ
  - ปรับปรุงการ์ดชิ้นส่วน BOM ในหน้าสแกน (`scan/page.tsx`) โดยเพิ่มคลาส `whitespace-nowrap` และ `shrink-0` ในกล่องแสดงรหัสสินค้าส่วนประกอบ (`c.componentItemCode`) และกล่องแสดงปริมาณการใช้ชิ้นส่วนย่อย เพื่อป้องกันตัวอักษรและข้อมูลสำคัญเบียดกันหรือย่อตัวจนตัดบรรทัดเมื่อเปิดดูผ่านมือถือหรืออุปกรณ์หน้าจอขนาดเล็ก

## 14 ก.ค. 2026
- **ปรับแก้การแสดงผลและระบบค้นหาหน้าคลังสินค้า/สต็อก (`frontend/app/inventory/page.tsx` และ `backend/src/index.ts`)**:
  - ผ่านกระบวนการสัมภาษณ์ความต้องการ `/grill-me` เพื่อออกแบบและพัฒนาระบบ **จัดจำแนกและแสดงผลสินค้าในหมวด Packaging ออกเป็น 5 หมวดหมู่ย่อย (`Sub-Categories`)**: 1) **แกลลอน (`GALLON`)** (สำหรับสินค้าที่ชื่อหรือหน่วยมีคำว่า Gallon, Pail, Drum, ถัง, ขวด, Can) 2) **ฟอยล์ (`FOIL`)** (สำหรับสินค้าที่มีคำว่า Foil, Film, Seal, Shrink, Sticker, ฟอยล์, ซีล, ฟิล์ม) 3) **ฝา (`CAP`)** (สำหรับสินค้าที่มีคำว่า Cap, Lid, ฝา) 4) **กล่อง (`BOX`)** (สำหรับสินค้าที่มีคำว่า Box, Carton, กล่อง, ลัง โดยไม่รวมสายรัดกล่อง) 5) **อื่นๆ (`OTHER`)** (สำหรับสินค้าประเภทอื่นๆ โดยให้ความสำคัญกับ `LABEL` / ฉลาก และ `สายรัดกล่อง / รัดกล่อง / STRAP` ให้ถูกจัดเข้าหมวดหมู่นี้เป็นอันดับแรกเสมอ เพื่อความถูกต้องแม่นยำสูงสุด) โดยมีระบบทำงานแบบ **2 ระบบคู่กัน (`Dual-Mode Interactive UI`)**:
    - **ปรับดีไซน์แท็บ Packaging ในหน้าจัดการสต็อก (`inventory/page.tsx`) ให้เรียบง่ายสะอาดตา**: ตามความต้องการของผู้ใช้ ได้นำระบบดีไซน์หมวดหมู่ย่อย 5 ประเภท (`Pill Tabs`, `Grouped View Toggle`, และ `Dropdown เปลี่ยนหมวดหมู่ย่อยในตาราง`) ออกจากหน้าจัดการสต็อกสินค้า (`inventory/page.tsx`) โดยให้แท็บ **Packaging (บรรจุภัณฑ์)** กลับมาแสดงผลในรูปแบบ **ตารางมาตรฐานเดียวกับ Bulk และ Raw Material** (`Item Code | ชื่อรายการ | คลัง/โซน | สูตรสินค้าหลัก Item 1 ที่ใช้งาน | คงเหลือ | จัดการ`) เพื่อความลื่นไหล เป็นระเบียบ ไม่รกสายตา และมีรูปแบบที่สม่ำเสมอกันทุกหมวดหมู่ในหน้าคลังสินค้า
  - ปรับเปลี่ยนโครงสร้างการจัดเรียงการ์ดสินค้าหลัก (`Item Type: FG`) ในหน้าคลังสินค้าให้เป็น **แถบแนวนอนยาว (`Horizontal Strip Card` - `flex flex-col md:flex-row items-center justify-between gap-6`)** ตามรูปแบบดีไซน์ในรูปแนบล่าสุด โดยแบ่งเนื้อหาภายในออกเป็น 3 คอลัมน์อย่างเป็นระเบียบ: 1) **คอลัมน์ซ้าย (QR Code Box)**: แสดงกรอบขาวมุมมนขนาดกะทัดรัด (`w-28 sm:w-36 h-28 sm:h-36 rounded-2xl bg-white`) พร้อมตกแต่งด้วยเส้นกรอบ reticle ทั้ง 4 มุมสีแดง (`#BE1111`) เพื่อความล้ำสมัย 2) **คอลัมน์กลาง (Product Details)**: ด้านบนแสดงป้ายหมวดหมู่ `FG (สินค้าหลัก)` สีแดงอ่อน ตามด้วยชื่อสินค้าตัวหนา, บรรทัดรหัสสินค้าพร้อมปุ่มคัดลอกรหัสทันที (`Copy item code`), และแถบข้อมูลคลังจัดเก็บคู่กับจำนวนส่วนประกอบในสูตร 3) **คอลัมน์ขวา (Stock & Actions)**: แสดงกล่องสรุป `STOCK คงเหลือ` ขนาดใหญ่ (`text-2xl sm:text-3xl font-black text-[#BE1111]`) วางคู่กับปุ่ม Action 2 ปุ่ม (`ดาวน์โหลด QR` และ `ดูรายละเอียด BOM`) พร้อมไอคอนดาว (`Star`) ที่มุมขวาบนของการ์ด ทั้งนี้ยังคงรักษา **โทนสีเดิมทั้งหมด 100%** และ **ฟอนต์ `font-display` เดิมทั้งหมด 100%** ตามความต้องการของผู้ใช้

  - ผ่านกระบวนการวิเคราะห์ความต้องการ `/grill-me` ปรับปรุงให้ **เวลาล้างคำค้นหา ระบบจะเด้งกลับไปที่หน้า/แท็บ "ทั้งหมด (`ALL`)" อัตโนมัติทันที**: 1) เพิ่มปุ่มกากบาท (`X`) ล้างคำค้นหาในช่องกรอกเมื่อมีข้อความค้นหาอยู่ 2) ไม่ว่าจะกดคลิกปุ่ม `X` หรือกดลบข้อความออกจนหมดด้วยแป้นพิมพ์ ระบบจะรีเซ็ตคำค้นหา, รีโหลดข้อมูลสินค้าทั้งหมด (`loadProducts('')`), และสลับแท็บไปที่ **"ทั้งหมด (`ALL`)"** ทันที เพื่อความสะดวกลื่นไหลในการใช้งาน
  - แก้ไขและพัฒนาระบบค้นหาให้รองรับ **การค้นหารหัสส่วนประกอบ (`componentItemCode`) และชิ้นส่วนทุกประเภท (`Bulk`, `Packaging`, `Raw Material`)** ได้อย่างแม่นยำ 100% จากเดิมที่ค้นหาพบเฉพาะ `Item Code` สินค้าหลัก (`FG`)
  - **ปรับปรุง Backend (`GET /products?search=...`)**: หากค้นหาด้วยรหัสส่วนประกอบ ระบบจะคืนค่าข้อมูลส่วนประกอบนั้นพร้อมเชื่อมโยงสินค้าหลัก (`parent FG`) เพื่อให้รู้ความสัมพันธ์ในสูตร โดยไม่ดึงชิ้นส่วนพี่น้องตัวอื่นในสูตรที่ไม่เกี่ยวข้องมารบกวนผลการค้นหา
  - **ปรับปรุง Frontend (`inventory/page.tsx`)**: เพิ่มการกรอง `displayedProducts` รองรับการค้นหาทันที พร้อมเพิ่มตารางแสดงส่วนประกอบที่ตรงกับคำค้นหา (`📦 ส่วนประกอบในสูตรที่ตรงกับการค้นหา "{search}"`) แสดงผลทันทีใต้การ์ดสินค้าหลักเมื่ออยู่บนแท็บ `ทั้งหมด` หรือ `FG` และแสดงผลในตารางชิ้นส่วนทันทีเมื่ออยู่บนแท็บเฉพาะ (`Bulk`, `Packaging`, `Raw`)
  - ลบส่วนหัวและรายการการแสดงผล **"แยกรายการตามสูตรสินค้าหลัก Item 1 ที่มีการใช้ชิ้นส่วน Bulk / Packaging / Raw Material"** (พร้อมการ์ดสินค้าหลัก FG ที่ซ้ำซ้อน) ออกจากหน้าเมื่อเลือกแท็บหมวดหมู่ชิ้นส่วน (`activeTab !== 'ALL' && activeTab !== 'FG'`) ทำให้หน้า Bulk แสดงเฉพาะตารางสรุปรายการสินค้า Bulk ที่ลื่นไหลและไม่รกตาตามความต้องการของผู้ใช้
  - ลบ **ปุ่ม "ปิด"** ออกจากหน้าต่าง **QR Code ประจำรหัสสินค้า (`QR Code Quick View & Download Modal`)** และขยายปุ่ม **"ดาวน์โหลดรูปภาพ PNG" (`[ 📥 ดาวน์โหลดรูปภาพ PNG ] bg-[#BE1111]`)** ให้กว้างเต็มความกว้าง (`w-full`) เพื่อความสวยงามสมดุลและลดความซ้ำซ้อนเนื่องจากมีปุ่มกากบาท (`X`) ที่มุมขวาบนของหน้าต่างอยู่แล้ว
  - ปรับดีไซน์ฟอนต์ข้อความทั้งหมดในหน้าสต็อก (`inventory/page.tsx`) โดยเปลี่ยนจาก `font-mono` ให้เป็น **`font-display`** (ฟอนต์เดียวกับชื่อสินค้า) ในทุกองค์ประกอบ 100% เช่น แท็กคลังจัดเก็บ (`📍 คลังจัดเก็บ`), แท็กส่วนประกอบในสูตร (`📦 ส่วนประกอบในสูตร`), กล่องตัวเลข Stock คงเหลือปัจจุบัน, ตัวเลขจำนวนรายการบนป้ายหมวดหมู่แท็บ, ตารางส่วนประกอบ BOM และตารางสินค้าทั่วไป เพื่อความสวยงาม เป็นระเบียบ และกลมกลืนเป็นแนวทางเดียวกันทั่วทั้งหน้าเว็บตามความต้องการของผู้ใช้
- **พัฒนาและปรับดีไซน์ช่องค้นหาพร้อมปุ่มกดค้นหารหัสชิ้นส่วน (`componentItemCode`) บนหน้ารายงานธุรกรรม (`frontend/app/reports/page.tsx` และ `backend/src/index.ts`)**:
  - ผ่านกระบวนการสัมภาษณ์วิเคราะห์ความต้องการ `/grill-me` ได้ข้อสรุปสเปกการปรับดีไซน์ใหม่ให้ตรงกับรูปแบบบน **หน้าคลังสินค้า/สต็อก (`/inventory`)**: 1) ขยายขนาดช่องกรอก (Input) ให้กว้างขวางเพื่อไม่ให้ข้อความ placeholder (`ค้นหา componentItemCode`) ขาดหาย 2) เพิ่ม **ปุ่มกดค้นหา (`[🔍 ค้นหา] bg-gray-900`)** คู่กับช่องกรอก 3) ปรับเงื่อนไขการกรองให้ทำงานเมื่อ **คลิกปุ่มค้นหาหรือกด Enter เท่านั้น** เพื่อไม่ให้ระบบรันค้นหาขณะที่ยังพิมพ์รหัสไม่เสร็จ
  - ปรับฟอนต์ ขนาด และสไตล์ (`className` of Input & Button) ให้เหมือนกับช่องค้นหาของ **หน้าสต็อก (`/inventory`) 100%** (เช่น ใช้ `rounded-xl`, ลบ `font-medium` ออกเพื่อให้ฟอนต์โปร่งและสบายตาเหมือนกันทุกประการ) พร้อมปรับเปลี่ยนคำ placeholder ในช่องค้นหาให้เป็นคำว่า **`ค้นหา component ItemCode`** ตามความต้องการของผู้ใช้
  - ปรับจัดวางตำแหน่งฟอร์มและปุ่มค้นหา (**Search Form Reordering**) ให้ย้ายไปอยู่ **ข้างหลังสุดต่อจาก Dropdown ทุกสถานะ** (`[ Dropdown วันที่ ] -> [ Dropdown สถานะ ] -> [ ช่องกรอกและปุ่มค้นหา ]`) เพื่อลำดับการเข้าถึงตัวกรองที่ลื่นไหลและดูสะอาดตาเป็นระเบียบ
  - เพิ่มการตรวจสอบและป้องกันข้อผิดพลาด (`Error Prevention`): หากผู้ใช้กรอกรหัสไม่ถูกต้องหรือไม่พบข้อมูล (`Transaction product.itemCode !== search`) ระบบจะแสดง Empty State แจ้งเตือนชัดเจนว่าไม่พบธุรกรรมของรหัสชิ้นส่วนนั้น พร้อมแนะนำให้ตรวจสอบความถูกต้องของรหัสชิ้นส่วนอีกครั้ง
  - อัปเดต Backend (`GET /transactions?search=...`) ให้รองรับเงื่อนไข `whereClause.product = { itemCode: search }` และอัปเดต `fetchTransactions` ใน `frontend/lib/auth.ts` ให้ส่ง parameter `search` ได้อย่างแม่นยำ 100% (Exact Match)
- **พัฒนาฟีเจอร์ปุ่มย้อนกลับ (Back Button Navigation) เมื่อสลับเข้าดูและทำรายการ BOM ชิ้นส่วนในหน้าสแกน QR Code (`frontend/app/scan/page.tsx`)**:
  - สร้างระบบประวัติการนำทางด้วย State `productHistory` เพื่อเก็บบันทึกข้อมูลสินค้าหลัก (เช่น `FG`) ก่อนที่ผู้ใช้จะกดคลิกสลับเข้าไปที่รายการส่วนประกอบ BOM แต่ละตัว
  - ปรับลดปุ่มย้อนกลับให้เหลือเพียง **1 ปุ่มหลัก (Back Button Card Banner)** ด้านบนสุดของ Modal โดยคลิกที่ตัวการ์ดแถบยาวด้านบนเพื่อย้อนกลับได้ทันที (ลบปุ่มย้อนกลับส่วนเกิน และปุ่มลูกศรวงกลมข้างปุ่มปิดออกตามความต้องการของผู้ใช้ เพื่อให้ UI คลีนและไม่ซ้ำซ้อน)
  - เมื่อผู้ใช้กดคลิกที่แถบปุ่มย้อนกลับ ระบบจะดึงข้อมูลสินค้าก่อนหน้าจาก State History และทำการโหลดสินค้าหลักพร้อมตารางสูตรการผลิต (SAP BOM) กลับคืนมาให้ทันทีโดยไม่ต้องเสียเวลาสแกนหรือค้นหาใหม่
- **แก้ไขปัญหาข้อผิดพลาดการตั้งค่า Next.js (`frontend/next.config.ts`)**:
  - แปลงไฟล์ `next.config.ts` เป็น `next.config.mjs` พร้อมอัปเดตการใช้ `fileURLToPath(import.meta.url)` และ `path.dirname` สำหรับ ES Module เพื่อรองรับ Next.js เวอร์ชันปัจจุบัน (`16.2.9`) ทำให้ไม่เกิด Error `Configuring Next.js via 'next.config.ts' is not supported` ในระหว่างรัน Dev Server (`npm run dev`)

## 13 ก.ค. 2026
- **ปรับปรุง UI/UX หน้าต่างรายงาน (Reports Tab) ให้ตรงตามหลัก Impeccable Design**:
  - เปลี่ยนแถบ Category Filters ให้เป็นแบบ Pill Tabs (`rounded-full`) พร้อมใช้ `framer-motion` ควบคุมแอนิเมชันตอนเลื่อนแท็บ
  - อัปเกรดตารางข้อมูลเป็นแบบคลีน (Clean Borders) แถวละมุมโค้งมนและมี Hover Effect สีเทาอ่อน เพื่อลดความกระด้างของ HTML Table ดั้งเดิม
  - จัดการ Responsive Layout ให้ตารางกลายเป็น **Card List** เมื่ออยู่บนจอมือถือ (Mobile View) เพื่อให้ไม่ต้องเลื่อนแนวนอน
  - ปรับใช้ฟอนต์ `font-mono` กับตัวเลข (จำนวน วันที่/เวลา และรหัสสินค้า) เพื่อการอ่านเปรียบเทียบหลักตัวเลขได้ง่ายขึ้น
- **ปรับปรุง UI/UX ของหน้า จัดการสต็อก (Inventory) และ Scan (สแกน) ให้ตรงตามหลัก Impeccable Design และทันสมัยยิ่งขึ้น**:
  - สร้าง Tab หมวดหมู่เป็นแบบ Pill แทน Dropdown เดิม ช่วยให้ผู้ใช้กดเปลี่ยนหมวดหมู่ได้อย่างรวดเร็วและเห็นภาพรวมได้ชัดเจน
  - ปรับปรุงการแสดงผล Card สินค้าให้มีความกลมมนแบบ `rounded-3xl` พร้อมเงาสะท้อน (Glassmorphism) และเพิ่ม Effect Hover
  - นำเทคโนโลยี `Framer Motion` เข้ามาใช้กับ Modals และ Error Banner เพื่อทำให้การเข้า-ออกของป็อปอัพดูสมูท (Smooth) และไร้รอยต่อ
- **ปรับปรุง UI/UX หน้าหลัก (Dashboard), หน้าสแกน (Scan), และหน้าเข้าสู่ระบบ (Auth) ให้สอดคล้องกับมาตรฐาน Impeccable Design ของระบบทั้งหมด**:
  - **หน้าหลัก (Dashboard)**: เพิ่มแอนิเมชัน `framer-motion` (Stagger effect) ตอนโหลดหน้าเว็บ เปลี่ยนปุ่ม Quick Action เป็นแบบโค้งมนพิเศษ `rounded-[2.5rem]` และใส่พื้นหลัง Glassmorphism (`backdrop-blur-md`) ให้กับกล่องสถานะระบบ เพื่อให้ First Impression ดูล้ำสมัย
  - **หน้าสแกน (Scan)**: อัปเกรดฟอร์มการทำรายการ (รับเข้า/จ่ายออก) จาก Select Dropdown แข็งๆ เป็น **Pill Tab Segmented Control** พร้อมแอนิเมชัน Layout Slider และปรับช่องกรอกข้อมูลให้มีความโค้งมน `rounded-2xl` และกระจกฝ้า เพื่อลด Cognitive Load ของผู้ใช้
  - **หน้าเข้าสู่ระบบและลงทะเบียน (Login/Register)**: ปรับ Layout จากฟอร์มคลาสสิกสู่สไตล์ Modern SaaS โดยเพิ่ม Soft Gradient Background, ทำ Card และ Input เป็น `rounded-[2rem]` / `rounded-2xl` พร้อม Spring Animation ช่วยเปิดตัวอย่างสวยงาม
- **ทำความสะอาดและแก้ไขปัญหา Linting Errors ทั้งหมดในโปรเจกต์**:
  - ลบตัวแปรและบรรทัดโค้ดที่ไม่ได้ใช้งาน (`unused variables`) ออกจากไฟล์เช่น `lib/auth.ts`, `scan/page.tsx`, `register/page.tsx`, `components/QRScanner.tsx`
  - แก้ไขปัญหาการเรียกใช้ `setState` ภายใน `useEffect` แบบไม่ปลอดภัย (Cascading renders warning) ให้โปรเจกต์ผ่านการ Build และพร้อม Deploy
- **ดีไซน์ปรับเปลี่ยนฟอนต์ชื่อสินค้า (Product Name) ในหน้าจัดการสต็อก (`eneos-frontend/app/inventory/page.tsx`) ให้เป็นโทนฟอนต์เรขาคณิตโมเดิร์นตามภาพ Donezo Dashboard (`Plus Jakarta Sans + Prompt`) พร้อมปรับลดขนาดตัวอักษรให้น่าอ่านและกะทัดรัดยิ่งขึ้น**:
  - วิเคราะห์พบสาเหตุที่ก่อนหน้านี้ฟอนต์ไม่เปลี่ยน เนื่องจากตัวแปรของ `next/font` ใช้ชื่อซ้ำกับตัวแปรใน `@theme inline` ของ Tailwind CSS v4 (`--font-display: var(--font-display)`) ทำให้เบราว์เซอร์มองว่าเป็น Cyclic Variable Reference แล้วยกเลิกการแสดงผลฟอนต์ดังกล่าว
  - ได้แก้ไขที่ไฟล์ `eneos-frontend/app/layout.tsx` โดยตั้งชื่อตัวแปรฟอนต์แยกกันอย่างชัดเจน ได้แก่ `--font-jakarta-sans` (`Plus Jakarta Sans`), `--font-prompt-sans` (`Prompt` สำหรับรองรับข้อความภาษาไทยให้โค้งมนสไตล์โมเดิร์นเข้ากัน) และ `--font-dm-sans` พร้อมประกาศใน `globals.css` ทั้งใน `@theme inline` และ `@layer utilities .font-display` ด้วยความสำคัญสูงสุด (`!important`)
  - ปรับลดขนาดตัวอักษรและน้ำหนักของชื่อสินค้า (`fg.name` และ `item.name`) ทุกจุดบนหน้าจัดการสต็อกเพื่อความสบายตา น่าอ่าน ไม่ล้นแถว และเป็นระเบียบตามคำขอของผู้ใช้:
    - **การ์ดหัวเรื่องสินค้าหลัก (FG Header Card)**: ปรับลดจาก `text-2xl sm:text-3xl font-extrabold` ลงมาเป็น `text-base sm:text-lg font-bold` ทำให้ชื่อสินค้าหลักขนาดพอดี อ่านง่ายและไม่ยาวเกินไป
    - **ตารางสรุปหมวดหมู่สินค้า / ตาราง Flat List / ตารางรายการทั่วไป (`<td>`)**: ปรับลดจาก `text-sm sm:text-base font-bold` ลงมาเป็น `text-xs sm:text-sm font-semibold text-gray-800` ทำให้แถวในตารางดูคลีน กะทัดรัด สแกนสายตาง่าย และไม่เทอะทะ
    - **Modal ดูสูตร BOM และดู QR Code**: ปรับลดขนาดหัวข้อชื่อสินค้าลงมาเป็น `text-base sm:text-lg font-bold` และ `text-sm sm:text-base font-bold` ตามลำดับ เพื่อให้พื้นที่ในหน้าต่าง Pop-up ดูสมดุลและอ่านสบายยิ่งขึ้น
- **นำกล่องตารางรายการ BOM ด้านล่างการ์ดสินค้าหลักออกในหน้าจัดการสต็อก (`eneos-frontend/app/inventory/page.tsx`)**:
  - ดำเนินการนำกล่องตารางรายการ BOM (`ตารางรายการ BOM (ส่วนประกอบและบรรจุภัณฑ์) ของ...`) ที่แสดงต่อท้ายการ์ดสินค้าหลัก (FG Header Card) ในโหมด Grouped View ออกตามคำขอของผู้ใช้ เพื่อให้หน้ารายการสินค้าหลักมีความคลีน สั้นกระชับ และไม่ยาวเกินไป
  - หากผู้ใช้งานต้องการตรวจสอบรายละเอียดหรือรายงานส่วนประกอบของสินค้าหลักใดๆ สามารถคลิกที่ปุ่ม **"ดูรายงานสูตร BOM"** ทางด้านขวาของการ์ดสินค้าหลักนั้นๆ เพื่อเปิดดูในหน้าต่าง Modal ได้ทันทีอย่างสะดวกและเป็นระเบียบ
- **นำตารางย่อยจำแนกหมวดหมู่ (Bulk, Packaging, Raw Material) ออกจากตารางรายการ BOM ในหน้าจัดการสต็อก (`eneos-frontend/app/inventory/page.tsx`)**:
  - ดำเนินการยกเลิกการแบ่งกลุ่มตารางย่อยแบบ Accordion (`Bulk`, `Packaging`, `Raw Material`) และ State `expandedBomSubgroups` ออกจากตารางรายการ BOM (`ตารางรายการ BOM (ส่วนประกอบและบรรจุภัณฑ์) ของ...`) ตามความต้องการของผู้ใช้
  - ปรับให้แสดงผลรายการส่วนประกอบทั้งหมด (`components`) เป็นตารางเดียวรวมกันโดยตรงภายในกล่อง BOM ทำให้ผู้ใช้สามารถมองเห็นและจัดการสต็อกของส่วนประกอบทั้งหมดได้ทันทีแบบรวดเร็วและต่อเนื่องโดยไม่ต้องกดเปิดดูทีละหมวดหมู่ย่อย
- **แก้ไขข้อผิดพลาด Build Error และ Syntax Error ในหน้าจัดการสต็อก (`eneos-frontend/app/inventory/page.tsx`)**:
  - ตรวจพบและแก้ไขปัญหา Syntax Error (`Unexpected token. Did you mean {'}'} or &rbrace;?`) บริเวณช่วงท้ายของตารางแสดงผลรายการส่วนประกอบ BOM (`group.items.map(...)`) โดยจัดระเบียบวงเล็บปิดของโครงสร้าง JSX ให้จับคู่ถูกต้องพอดีกับโครงสร้าง Card และ Map loop
  - เพิ่มการประกาศ State `expandedBomSubgroups` และฟังก์ชันอัปเดต `setExpandedBomSubgroups` (`useState<Record<string, boolean>>({})`) เพื่อรองรับระบบย่อ/ขยายตารางตามหมวดหมู่ (Bulk, Packaging, Raw Material) แก้ไขปัญหาข้อผิดพลาด TypeScript (`Cannot find name 'expandedBomSubgroups'` และ implicit 'any' type) ส่งผลให้ Build ผ่านเรียบร้อยและเว็บแอปกลับมาใช้งานได้ตามปกติทันที
- **นำป้ายข้อความ "สินค้าหลัก (FG - Finished Goods)" ออกจากการ์ดสินค้าในหน้าจัดการสต็อก (`eneos-frontend/app/inventory/page.tsx`)**:
  - ดำเนินการลบป้ายข้อความ/ไอคอนมงกุฎ `👑 สินค้าหลัก (FG - Finished Goods)` ออกจากส่วนหัวของการ์ดสินค้าหลักในโหมด Grouped View ตามคำขอของผู้ใช้ โดยยังคงป้ายรหัสสินค้า (`Item Code: ...`) และฟังก์ชันการทำงานอื่นๆ ของการ์ดสินค้าไว้คงเดิมทุกประการ
- **นำกล่องตัวกรองหน่วยนับ (Unit Filter Dropdown) ออกจากหน้าจัดการสต็อก (`eneos-frontend/app/inventory/page.tsx`)**:
  - ดำเนินการนำกล่อง Dropdown ตัวกรองตามหน่วยนับ (`หน่วยนับ (Unit Filter)`) และ State (`selectedUnit`, `isUnitDropdownOpen`) ออกจากหน้าจัดการสต็อก (`/inventory`) ตามที่ผู้ใช้ร้องขอ
  - ปรับขนาดและเค้าโครง UI ของกล่องตัวกรองหมวดหมู่สินค้า (`Category Filter`) ให้มีความพอดีและสวยงามทันสมัยยิ่งขึ้น พร้อมปรับเงื่อนไข `matchesUnit` ให้คืนค่า `true` เสมอ เพื่อให้ตรรกะการกรองข้อมูลในทุก View Mode (`Grouped` และ `Flat`) ยังคงทำงานได้อย่างราบรื่นและถูกต้องตามปกติ
- **แก้ไขปัญหาข้อมูล BOM จากฐานข้อมูลไม่ขึ้นแสดงบนหน้าเว็บแอพเมื่อทำการค้นหา (`ส่วนประกอบในสูตร: 0 รายการ`) (`backend/src/index.ts`)**:
  - วิเคราะห์พบสาเหตุที่เมื่อผู้ใช้ค้นหารหัสหรือชื่อสินค้าในหน้าจัดการสต็อก (เช่น พิมพ์ค้นหา `YAMALUBE 4 FOR OUTBOARD SJ`) แล้วตารางรายการส่วนประกอบด้านล่างการ์ดสินค้าแสดงผลเป็น `รวม 0 ส่วนประกอบ` (`ยังไม่มีรายการวัตถุดิบหรือส่วนประกอบที่ผูกกับสูตรรหัสหลักนี้`) ทั้งที่ในฐานข้อมูลตาราง `BillOfMaterial` มีข้อมูลครบถ้วน:
    - เนื่องจาก API เดิมของ `GET /products?search=...` ใช้คำสั่ง `prisma.product.findMany({ where: whereClause })` โดยกรองหาเฉพาะสินค้าที่มีข้อความตรงกับคำค้นหา (`YAMALUBE 4 FOR OUTBOARD SJ`) ซึ่งตรงกับเฉพาะตัวสินค้าหลัก (`FG`) 9 รายการเท่านั้น แต่ไม่ตรงกับรหัส/ชื่อของชิ้นส่วนประกอบ (`TZ-422`, `PAIL YAMALUBE`, `LG-17`, `EHC 50` ฯลฯ) ส่งผลให้ชิ้นส่วนประกอบไม่ถูกส่งกลับมาให้หน้าเว็บ เมื่อหน้าเว็บทำการกรองชิ้นส่วนจาก State ปัจจุบัน (`products.filter(p => p.parentItemCodes?.includes(fg.itemCode))`) จึงได้ผลลัพธ์เป็น 0 รายการ
  - **ปรับปรุงตรรกะการดึงข้อมูลของ API (`GET /products`) ให้ฉลาดและเชื่อมโยงความสัมพันธ์ BOM อัตโนมัติ (Search Component Expansion)**:
    - เมื่อมีการค้นหา (`search` หรือ `itemType`) ระบบจะหาคู่ความสัมพันธ์จาก `billOfMaterial` ของสินค้าที่ตรงเงื่อนไข แล้ว **ดึงสินค้ารายการส่วนประกอบ (`componentItemCode`) ทุกชิ้นที่ผูกกับสินค้าหลักที่ค้นเจอส่งกลับไปพร้อมกันเสมอ (`requiredCodes`)**
    - ทำให้เมื่อผู้ใช้ค้นหาสินค้าใดๆ ในหน้าเว็บ ตารางรายการ BOM ด้านล่างการ์ดสินค้าจะได้รับข้อมูลครบถ้วนทันทีและแสดงรายละเอียด BOM ครบ 100% ตรงตามฐานข้อมูล Supabase (เช่น ค้นหา `YAMALUBE 4 FOR OUTBOARD SJ` รหัส `60230073C600A` จะขึ้นครบทั้ง 9 รายการทันทีโดยไม่มีคำว่า 0 รายการอีกต่อไป)
- **แก้ไขปัญหาความสอดคล้องของจำนวนและรายการ BOM ระหว่างหน้าสแกน QR Code (`/scan`) กับหน้าจัดการสต็อก (`/inventory`)**:
  - วิเคราะห์สาเหตุที่ทำให้ผู้ใช้พบว่าจำนวนรายการ BOM ในหน้าสแกน (เช่น แสดง 9 รายการ) ไม่ตรงกับในหน้าสต็อกสินค้า (เช่น แสดง 10 รายการ):
    - เนื่องจากในฐานข้อมูล SAP BOM (`billOfMaterial` และตาราง `product`) มีบรรทัดที่รหัสสินค้าหลัก (`FG` / `c.componentItemCode === c.parentItemCode` หรือ `depth == 1`) ถูกผูกอ้างอิงถึงตัวเองในฐานะ Header
    - ก่อนหน้านี้ ในหน้าสแกน (`/scan`) ได้กรองรหัสสินค้าหลักที่เป็น Header ออกจากรายการส่วนประกอบแล้ว (เหลือเฉพาะส่วนประกอบจริง 9 รายการ) ในขณะที่หน้าจัดการสต็อก (`/inventory`) ทั้งในตารางส่วนประกอบด้านล่างการ์ดสินค้า และในหน้าต่าง Pop-up ดูรายงานสูตร BOM ยังนับรวมรหัสสินค้าหลักตัวเองเข้าไปด้วย ทำให้ตัวเลขบนหน้าสต็อกกลายเป็น 10 รายการ และรหัสสินค้าหลักถูกจับไปอยู่ในกลุ่ม Raw Material
  - **ปรับปรุงให้ตัวเลขและการจัดกลุ่มตรงกัน 100% ทั่วทั้งระบบ**:
    - ปรับปรุงการกรองใน `app/inventory/page.tsx` ทั้งในส่วนคำนวณ `components` ใต้การ์ดสินค้า (`p.itemCode !== fg.itemCode`) และในตาราง Modal รายงานสูตร BOM (`comp.componentItemCode !== comp.parentItemCode`) ให้กรอง Header ตัวเองออก
    - ส่งผลให้ทั้งหน้าจัดการสต็อก (`/inventory`) และหน้าสแกน (`/scan`) แสดงผลจำนวนรายการส่วนประกอบสูตร BOM เท่ากันพอดี (ตัวอย่างเช่น PAIL YAMALUBE 20L แสดง 9 รายการ: Bulk 1, Packaging 2, Raw Material 6) ถูกต้อง ไม่สับสนและไม่ซ้ำซ้อน
- **แก้ไขปัญหารายการ BOM หมวดหมู่ Packaging ไม่แสดงข้อมูลเมื่อสแกน QR Code (`eneos-frontend/app/scan/page.tsx`)**:
  - วิเคราะห์พบว่าฟังก์ชัน `getBomComponentGroup(c)` เดิมทำการตรวจสอบเงื่อนไข `c.depth === 2 || c.uom === 'KG'` แล้วคืนค่าเป็นหมวดหมู่ `'Bulk'` ทันที ส่งผลให้บรรจุภัณฑ์ที่อยู่ในสูตรการผลิต (เช่น กล่อง Box, แกลลอน Gallon, ฟอยล์ Foil ที่อยู่ในระดับ depth 2 ของ SAP BOM) ถูกจัดให้อยู่ในกลุ่ม Bulk ทั้งหมด ทำให้หมวดหมู่ Packaging แสดงผลเป็น 0 รายการ (`BOM ตรง Packaging ไม่มีข้อมูลขึ้น`)
  - **ปรับปรุงลำดับการตรวจสอบและเงื่อนไขจำแนกหมวดหมู่ (Group Classification Logic)**:
    - ให้ตรวจสอบเงื่อนไขของหมวดหมู่ **`Packaging` เป็นอันดับแรก** โดยครอบคลุมทั้ง รหัสสินค้าขึ้นต้นด้วย `75`, `PK`, `BOX`, `GAL`, `LBL`, `FOIL` หรือชื่อสินค้า/หน่วยนับที่เกี่ยวกับ `Box`, `Gallon`, `Foil`, `Pail`, `Drum`, `Sticker`, `กล่อง`, `ฉลาก`, `ฝา` ทำให้ระบบจำแนกชิ้นส่วนบรรจุภัณฑ์ได้อย่างแม่นยำ 100%
    - กรองรายการรหัสสินค้าหลัก (`FG`) ที่เป็น Header (ที่ `c.componentItemCode === c.parentItemCode`) ออกจากการนับและจัดกลุ่มย่อย เพื่อไม่ให้เกิดความซ้ำซ้อนในกลุ่ม Bulk ทำให้ตัวเลขจำนวนรายการส่วนประกอบตรงกับตารางสูตรการผลิตจริงทุกประการ
- **พัฒนาฟีเจอร์แสดงรายการ BOM (Bill of Materials) แบบจัดกลุ่มย่อยอัตโนมัติ พร้อมระบบ Drill-down เมื่อสแกน QR Code ในหน้าสแกน (`eneos-frontend/app/scan/page.tsx`)**:
  - จากการสัมภาษณ์ความต้องการผ่าน `/grill-me` ได้ข้อสรุปให้ปรับปรุงเฉพาะในหน้าสแกน QR Code (`/scan`) เมื่อผู้ใช้ใช้กล้องสแกนหรือค้นหารหัสสินค้าเจอ ระบบจะทำการดึงสูตรการผลิต SAP BOM (`fetchProductBom`) และ **เปิดขยายแสดงตารางรายการ BOM (`setShowBom(true)`) ขึ้นมาโดยอัตโนมัติทันที**
  - **จัดกลุ่มรายการส่วนประกอบ BOM ตามมาตรฐานเดียวกับหน้า Inventory (`Bulk`, `Packaging`, `Raw Material`)**:
    - แยกแสดงส่วนประกอบย่อยออกเป็น 3 หมวดหมู่ชัดเจน พร้อมป้าย Pill แสดงจำนวนชิ้นส่วนของแต่ละกลุ่ม และระบบย่อ/ขยาย (`Collapse / Expand`) แยกกลุ่มอิสระ (`expandedBomSubgroups`)
  - **ระบบโต้ตอบอัจฉริยะ (BOM Drill-down)**: ผู้ใช้สามารถคลิกที่รายการส่วนประกอบใดๆ ในตาราง BOM (เช่น คลิกวัตถุดิบหรือบรรจุภัณฑ์ที่อยู่ในสูตร) เพื่อสลับและโหลดข้อมูลสินค้าของส่วนประกอบชิ้นนั้นขึ้นมาบนหน้าต่างสแกนทันที ช่วยให้สามารถตรวจสอบสต็อกคงเหลือ หรือทำรายการรับเข้า/จ่ายออก (`Receive / Issue`) ต่อเนื่องบนชิ้นส่วนย่อยได้อย่างรวดเร็ว ไร้รอยต่อ
- **เพิ่มตัวกรองมุมมองตามหน่วยนับสินค้า (Unit Filter Dropdown) ในหน้าจัดการสต็อกสินค้า (Inventory)**:
  - เพิ่ม Dropdown สำหรับกรองตามหน่วยนับ (`selectedUnit`) วางคู่กับ Dropdown กรองหมวดหมู่สินค้า (`activeTab`) ในรูปแบบ 2-column Grid ที่ทันสมัยและคลุมโทน Sleek Apple-style Apple Minimalist
  - มีตัวเลือกหน่วยนับตามที่กำหนด พร้อมแสดงจำนวนรายการของแต่ละหน่วยนับแบบเรียลไทม์:
    - **All Units (ทุกหน่วยนับ)** (`ALL`)
    - **Pail20L** (`Pail20L`)
    - **Litre** (`Litre`)
    - **Kilogram** (`Kilogram`)
    - **Label18L** (`Label18L`)
  - **ระบบกรองข้อมูลอัจฉริยะครอบคลุมทุกโหมดการแสดงผล**:
    - **Grouped Mode (จัดกลุ่มตาม Item 1)**: เมื่อเลือกหน่วยนับใดๆ ระบบจะกรองแสดงเฉพาะสินค้าหลักหรือส่วนประกอบ BOM ที่มีหน่วยนับตรงกับที่เลือก (`matchesUnit(p.unit)`) หากสินค้าหลักมีส่วนประกอบที่ตรงกับหน่วยนับ เมื่อขยายตาราง BOM ออกมา จะแสดงเฉพาะรายการส่วนประกอบที่ใช้หน่วยนับนั้นเท่านั้น
    - **Flat List Mode (แบบแยกรายการ)** และตารางสรุปหมวดหมู่ย่อย (Bulk, Packaging, Raw Material, Unassigned Items): ทำการกรองแสดงผลเฉพาะรายการที่มีหน่วยนับตรงกับตัวเลือกอย่างแม่นยำ
- **ปรับค่าเริ่มต้นหน้าจัดการสต็อก (Inventory) ให้ซ่อนตารางรายการส่วนประกอบ BOM ไว้ก่อนตอนเข้าหน้าเว็บตามความต้องการ**:
  - จากเดิมเมื่อผู้ใช้เข้ามาที่หน้าจัดการสต็อก (`eneos-frontend/app/inventory/page.tsx`) ระบบเปิดขยายตารางรายการส่วนประกอบ BOM (`expandedParents[fg.itemCode] ?? true`) ใต้สินค้าหลัก (FG) ทุกตัวโดยอัตโนมัติ ทำให้หน้าเว็บโหลดมายาวมากและต้องเลื่อนหาสินค้าหลักตัวอื่นนาน
  - ได้ปรับค่าเริ่มต้นเป็น `false` (`expandedParents[fg.itemCode] ?? false`) เพื่อให้ตอนเข้าสู่หน้าจัดการสต็อกครั้งแรก ระบบจะแสดงเฉพาะกล่องข้อมูลสินค้าหลัก (FG Header Card) ที่สะอาดตาและสั้นกระชับ โดยซ่อนตาราง BOM ด้านล่างไว้ก่อนทั้งหมด
  - หากผู้ใช้ต้องการดูรายการส่วนประกอบของสินค้าหลักใด สามารถคลิกปุ่ม **"แสดงรายการ BOM"** ทางด้านขวาของกล่องสินค้าหลักนั้น เพื่อเปิดขยายตาราง BOM และหมวดหมู่ย่อย (Bulk, Packaging, Raw Material) ออกมาได้อย่างนุ่มนวลทันที
- **เพิ่มการจัดกลุ่มรายการ BOM (BOM Sub-grouping) เป็นหมวดหมู่ Bulk, Packaging และ Raw Material พร้อมระบบ Collapse / Expand และป้ายสรุปจำนวนรายการ**:
  - จากเดิมในหน้าจัดการสต็อก (`eneos-frontend/app/inventory/page.tsx`) เมื่อกดดูรายการส่วนประกอบ BOM ใต้สินค้าหลัก (FG) รายการวัตถุดิบทั้งหมดจะถูกแสดงรวมกันเป็นตารางเดียวยาวต่อเนื่อง ทำให้แยกว่ารายการใดเป็น Bulk หรือ Packaging ได้ยาก
  - ได้พัฒนาการแสดงผลแบบจัดกลุ่มย่อย (Accordion Sub-groups) ออกเป็น 3 หมวดหมู่ชัดเจน:
    1. **Bulk (กึ่งสำเร็จรูป / สารผสม)**: แสดงเฉพาะรายการประเภท `Bulk` พร้อมไอคอนหยดน้ำ (Droplets)
    2. **Packaging (บรรจุภัณฑ์ / กล่อง / ป้าย)**: แสดงเฉพาะรายการประเภท `Packaging` พร้อมไอคอนกล่อง (Box)
    3. **Raw Material (วัตถุดิบตั้งต้น / เคมีภัณฑ์ / อื่นๆ)**: แสดงรายการวัตถุดิบทั้งหมดที่เหลือ พร้อมไอคอนขวดทดลอง (FlaskConical)
  - **ระบบ Collapse / Expand แยกกลุ่มอิสระ**: ผู้ใช้สามารถคลิกที่แถบหัวเรื่องของแต่ละกลุ่ม (เช่น กดปุ่มที่กลุ่ม Bulk หรือ Packaging) เพื่อย่อ/ขยายตารางรายการเฉพาะกลุ่มนั้นได้ทันที (`expandedBomSubgroups`) โดยค่าเริ่มต้นเปิดแสดงทั้งหมดทุกกลุ่มเพื่อให้เห็นข้อมูลครบถ้วน
  - **ป้ายแสดงจำนวนรายการประจำกลุ่ม (Count Badges)**: แต่ละหัวกลุ่มมีป้าย Pill ชัดเจนระบุจำนวนรายการ (เช่น `1 รายการ`, `2 รายการ`, `7 รายการ`) และเมื่อไม่มีรายการในหมวดใดจะแสดงข้อความแจ้ง "ไม่มีรายการในหมวดหมู่นี้" อย่างเป็นระเบียบตามโทนสีมินิมอล Sleek Clean Slate & White
- **ปรับเปลี่ยนดีไซน์และคุมโทนสีทั่วทั้งเว็บแอปให้มีความทันสมัยและมินิมอล (Sleek Clean Slate & White with Red Accent) ตามข้อสรุปจากการสัมภาษณ์ผ่าน /grill-me**:
  - จากเดิมที่หน้าเว็บแอป (โดยเฉพาะหน้า Inventory) มีการใช้กล่องไล่สีแดงสดขนาดใหญ่ (#8E0B0B-#D62828) ตัดกับแถบหัวเรื่องสีน้ำเงินเข้ม/ดำ (Slate 900) และป้ายประเภทชิ้นส่วนสีสันสดใสหลายสี ทำให้หน้าเว็บดูหนักตาและไม่คุมโทนไปในทิศทางเดียวกัน
  - ได้ปรับเปลี่ยนโครงสร้างและระบบสีใน `eneos-frontend/app/inventory/page.tsx` และตรวจสอบความสอดคล้องทั่วทั้งเว็บแอป ออกมาเป็นดีไซน์ Apple-style มินิมอลที่สะอาดตาและหรูหรา:
    1. **กล่องข้อมูลสินค้าหลัก (FG Header Card)**: เปลี่ยนจากกล่องทึบสีแดงไล่เฉด เป็น **การ์ดสีขาวคลีน กรอบบางสีเทาอ่อน (White Card with Soft Slate Border)** ตกแต่งป้ายตัวอักษร ไอคอนมงกุฎ และตัวเลข Stock คงเหลือขนาดใหญ่ด้วยสีแดงแบรนด์ (`#BE1111`) เพื่อความโดดเด่นและสบายตา
    2. **แถบหัวเรื่องตาราง BOM และ Flat View**: เปลี่ยนจากกล่องสีดำ/เทาเข้ม (Slate 900) เป็น **แถบหัวเรื่องสีเทาอ่อนสะอาดตา (Light Slate Header - bg-slate-50)** พร้อมตัวอักษรสีเทาเข้มคมชัด ทำให้กล่องข้อมูลและตารางดูกลมกลืนเป็นเนื้อเดียวกันทั้งหน้า
    3. **ป้ายประเภทชิ้นส่วนในตาราง (Item Type Badges) และปุ่มตัวกรองหมวดหมู่**: ปรับให้อยู่ในโทน **Monochrome & Soft Gray Badges (`bg-slate-100 text-slate-700`)** ที่นุ่มนวล โดยสงวนสีแดง Accent (`#BE1111`) ไว้ใช้เฉพาะกับป้ายสินค้าหลัก (FG) หรือตัวกรองที่กำลังเลือกใช้งานอยู่เท่านั้น ทำให้ภาพรวมของเว็บแอปสว่าง คลีน และคุมโทนเป็นหนึ่งเดียวกัน 100%
- **ปรับปรุงดีไซน์หน้าจัดการสต็อก (Inventory) ให้แยกข้อมูลสินค้าหลัก (FG) ออกจากรายการตาราง BOM ด้านล่างอย่างชัดเจนตามความต้องการ**:
  - จากเดิมที่รายการสินค้าหลัก (Finished Goods - Item 1) ถูกแสดงเป็นเพียงแถบ Header Bar สีแดงเชื่อมติดอยู่ในกล่องเดียวกับตารางรายการส่วนประกอบ BOM ทำให้ข้อมูลดูซ้อนกันและไม่แยกสัดส่วนชัดเจน
  - ได้ออกแบบและปรับปรุงโครงสร้างใน `eneos-frontend/app/inventory/page.tsx` แยกข้อมูลออกเป็น 2 กล่อง (Cards) อย่างชัดเจน:
    1. **กล่องด้านบน (Header Card - ข้อมูลสินค้าหลัก FG)**: แสดงข้อมูลสำคัญของสินค้าสำเร็จรูปหลัก ได้แก่ **QR Code** (พร้อมฟังก์ชันคลิกขยาย/ดูและดาวน์โหลดไฟล์ PNG), **Item Code** (รหัสสินค้าหลัก FG Item 1), **ชื่อสินค้า**, **Stock คงเหลือปัจจุบัน** (พร้อมระบุหน่วยนับและสถานที่จัดเก็บ) และปุ่มดูรายงานสูตร BOM
    2. **กล่องด้านล่าง (BOM Components Table Card)**: แยกออกมาเป็นตารางส่วนประกอบ BOM อย่างเป็นสัดส่วน ด้านบนมี Header ระบุชัดเจนว่า "ตารางรายการ BOM (ส่วนประกอบและบรรจุภัณฑ์) ของ [รหัสสินค้าหลัก]" พร้อมแสดงรายการ Bulk, Packaging, Raw Material, ยอดคงเหลือ และปุ่มจัดการครบถ้วน
- **ทำความสะอาดและลบสินค้าที่ไม่ได้อยู่ในตาราง BillOfMaterial ออกจากตาราง Product และปรับให้เว็บแอปใช้ข้อมูลจาก BillOfMaterial เป็นฐานข้อมูลหลักเท่านั้นตามความต้องการ**:
  - ได้พัฒนาสคริปต์ `backend/src/cleanNonBomProducts.ts` รันตรวจสอบรหัสสินค้าทั้งหมดในตาราง `Product` (เดิมมี 256 รายการ ซึ่งมีสินค้ารหัส `7290...` เช่น เสื้อโปโล เสื้อคอกลม และสินค้าเก่าที่ไม่เกี่ยวข้องกับสูตรการผลิต YAMALUBE ปะปนอยู่) เทียบกับรายการในตาราง `BillOfMaterial` (`parentItemCode` และ `componentItemCode`)
  - สคริปต์ได้ทำการลบรายการสินค้าที่ไม่อยู่ในตารางสูตร `BillOfMaterial` ออกจากตาราง `Product` ครบถ้วนจำนวน 214 รายการ ทำให้ปัจจุบันตาราง `Product` ใน Supabase คงเหลือเฉพาะรหัสสินค้าที่อยู่ในสูตรการผลิต `BillOfMaterial` จำนวนตรงกันพอดี 42 รายการ 100%
  - ปรับปรุง API Endpoints ใน `backend/src/index.ts` ได้แก่ `GET /products` และ `GET /products/:itemCode` โดยเพิ่มระบบคัดกรอง (Strict Filtering via `bomItemCodes`) เพื่อให้มั่นใจว่าการแสดงผลและทำรายการทุกจุดบนหน้าเว็บแอป (ทั้งหน้าจัดการสต็อกและหน้าสแกน QR Code) จะใช้เฉพาะข้อมูลที่มีอยู่จริงในตารางสูตร `BillOfMaterial` เป็นฐานข้อมูลหลักเท่านั้น ไม่ให้มีสินค้าแปลกปลอมอื่นหลุดเข้ามาแสดงผลได้อีกในอนาคต
- **แก้ไขปัญหายอดคงเหลือบนหน้าเว็บแสดงเป็น 0 และซิงค์ตัวเลขสต็อกคงเหลือ (Quantity) ลงตาราง Product ใน Supabase สำเร็จ**:
  - จากเดิมที่หน้าเว็บจัดการสต็อก (`app/inventory/page.tsx`) แสดงคอลัมน์ "คงเหลือ" เป็นตัวเลข `0` ทุกรายการ (เช่น `60230073A600E`, `I-NIPPO063013`, `5312001`, `2080035` ฯลฯ) ทั้งที่มีตัวเลขอยู่ในรายงานสูตรการผลิต `Bill of Materials Report ( YAMALUBE ).xlsx` และตาราง `BillOfMaterial`
  - วิเคราะห์พบสาเหตุ 2 ข้อคือ: (1) ตอนสคริปต์ `importMasterData.ts` สร้างรายการสินค้าหลักลงตาราง `Product` ใน Supabase ถูกเขียนกำหนดค่าเริ่มต้นไว้ว่า `quantity: 0` เสมอ ทำให้ยอดสต็อกคงเหลือจริงในตาราง `Product` เป็น `0` แม้ตารางสูตร `BillOfMaterial` จะมียอด `Quantity` อยู่ครบ (2) สคริปต์นำเข้าสต็อก (`import_stock.ts`) ค้นหาคอลัมน์ด้วยคำว่า `'total'` อย่างเดียว ซึ่งไม่ตรงกับชื่อคอลัมน์ `Quantity` ของไฟล์และตาราง
  - ได้พัฒนาสคริปต์ซิงค์ยอดคงเหลือ `backend/src/syncStockFromBom.ts` และรันเชื่อมต่อกับ Supabase เพื่ออัปเดตคอลัมน์ `quantity` ในตาราง `Product` ให้ตรงกับตัวเลข `Quantity` ในสูตรการผลิตและไฟล์ Excel ทำให้ตอนนี้หน้าเว็บจัดการสต็อกและระบบสแกน QR Code ดึงยอดคงเหลือขึ้นมาแสดงอย่างถูกต้องทันที (เช่น `60230073A600E: 1`, `I-NIPPO063013: 24`, `5312001: 16.3034`, `2080068: 1.6632`, `2080154: 2.4641` ฯลฯ)
  - ปรับปรุง `backend/src/importMasterData.ts` ให้บันทึกยอด `Quantity` ลงในตาราง `Product` ตั้งแต่ขั้นตอนนำเข้าครั้งแรก และปรับปรุง `backend/src/import_stock.ts` ให้ค้นหาทั้งคอลัมน์ `'total'` และ `'quantity'` เพื่อความถูกต้องในอนาคต
  - ปรับเพิ่ม `connection_limit=5` ใน `DATABASE_URL` ของไฟล์ `.env` เพื่อป้องกันปัญหากลุ่มการเชื่อมต่อของ Supabase Connection Pooler (`pgbouncer=true`) เต็มจนเชื่อมต่อไม่ผ่าน
- **เพิ่มระบบ QR Code ประจำ Item Code ทุกรายการ (พร้อมปุ่มดูและดาวน์โหลดไฟล์ PNG) และอัปเกรดระบบสแกน QR Code รองรับการทำรายการครบถ้วนตามความต้องการ**:
  - จากเดิมที่หน้าจัดการสต็อกสินค้า (`app/inventory/page.tsx`) มี QR Code ให้ดูเฉพาะแถบหัวข้อสูตรหลัก (Parent Item 1: `60230073A600E`) ทำให้รายการชิ้นส่วน ชิ้นงานบรรจุภัณฑ์ วัตถุดิบ หรือสินค้าอื่นๆ (เช่น `I-NIPP0063013`, `7520000062`, `2080035`, `5312001` ฯลฯ) ไม่สามารถดูหรือดาวน์โหลด QR Code ประจำ Item Code ของตัวเองได้
  - ได้ทำการปรับปรุงตารางแสดงผลทุกตารางในหน้า `app/inventory/page.tsx` (ทั้งตารางส่วนประกอบ BOM ในสูตร, ตารางสรุปหมวดหมู่ Bulk / Packaging / Raw Material, ตารางสินค้าระบุสูตรทั่วไป และโหมดรายการทั้งหมด Flat List) โดยเพิ่มปุ่มตราสัญลักษณ์ **`[📱 QR Code]` พร้อมรูปไอคอนคิวอาร์โค้ดสีแดง** ไว้ติดกับรหัส Item Code ของทุกรายการ
  - เมื่อคลิกที่ปุ่ม QR Code ของรายการใดก็ตาม ระบบจะเปิดหน้าต่าง **QR Code Quick View & Download Modal** ที่แสดงรูปภาพ QR Code ความละเอียดสูงประจำ Item Code นั้นๆ พร้อมแสดงรายละเอียดชื่อสินค้า หมวดหมู่ คลังจัดเก็บ ยอดคงเหลือปัจจุบัน และปุ่ม **"ดาวน์โหลดรูปภาพ PNG"** (ซึ่งจะแปลง SVG เป็นภาพ PNG ขนาด 600x600px ขอบขาวคมชัดพร้อมนำไปพิมพ์ติดป้ายสินค้าหรือใช้งานได้ทันที) รวมถึงเพิ่มกล่อง DOM ลับ (`id="qr-{itemCode}"`) ไว้รองรับการกดดาวน์โหลดตรงจากทุกจุด
  - ปรับปรุงและตรวจสอบระบบสแกนสินค้าในหน้า `app/scan/page.tsx` ให้มีฟังก์ชัน `extractItemCode` พร้อมรองรับทั้งการใช้กล้องสแกน หรือเข้าผ่านลิ้งก์พารามิเตอร์ (`?code=...`) โดยเมื่อสแกน QR Code ของ Item Code ใดก็ตาม (ไม่ว่าเป็น `FG`, `Bulk`, `Packaging` หรือ `Raw Material`) ระบบจะแสดงการ์ดข้อมูลสินค้าแบบครบถ้วนทันที ได้แก่:
    1. **ชื่อสินค้า** (`product.name`)
    2. **หน่วยนับ** (`product.unit`)
    3. **คลังจัดเก็บ** (`product.warehouse || product.location || 'ไม่มี'`)
    4. **ยอดคงเหลือ** (`product.quantity`)
    5. **ประเภทรายการ** (`รับเข้า (Receive)` / `จ่ายออก (Issue)`)
    6. **จำนวน** (`ระบุจำนวน`)
    7. **หมายเหตุ (ถ้ามี)** (`ใส่หมายเหตุหรือรายละเอียดเพิ่มเติม...`)
    8. **ปุ่มที่ยืนยันทำรายการ** (`ยืนยันทำรายการ`)
  - หน้าเว็บแอปพลิเคชันทั้งพอร์ต `3000` และ `4000` ทำงานได้อย่างสมบูรณ์และแสดงผลได้อย่างสวยงามพรีเมียม (`Tested & Verified HTTP Status 200`)
- **เพิ่มระบบ `try...catch` ครอบคลุมทุก API Endpoints (`/users`, `/products`, `/products/:itemCode`, `/transactions`) และติดตั้ง Global Error Handler / Process Exception Catchers ในไฟล์ `backend/src/index.ts` เพื่อป้องกันเซิร์ฟเวอร์ดับเวลาเน็ตสะดุดหรือเชื่อมต่อฐานข้อมูลไม่ได้ (`Server Crash Prevention & Graceful Degradation`)**:
  - จากปัญหาก่อนหน้าที่เมื่ออินเทอร์เน็ตหลุดหรือฐานข้อมูล Supabase ตอบสนองไม่ทัน (`Can't reach database server / Connection Timeout`) โค้ดใน API Endpoints ที่ไม่มี `try...catch` ดักจับจะส่งผลให้ Node.js มองว่าเป็น `Unhandled Promise Rejection` และปิดโปรเซสเซิร์ฟเวอร์ลงทันที (`Crash / Exited`) ทำให้ผู้ใช้เข้าเว็บไม่ได้จนกว่าจะเปิด Terminal มารันเซิร์ฟเวอร์ใหม่
  - ได้ทำการเพิ่ม `try...catch` ให้กับทุก Endpoint ที่เหลือ (`/users`, `/products`, `/products/:itemCode`, `/transactions`) เพื่อดักจับข้อผิดพลาดการดึงข้อมูลจาก Prisma ทั้งหมด และส่งกลับ HTTP Status 500 พร้อมข้อความภาษาไทยที่เข้าใจง่าย เช่น `"ไม่สามารถดึงข้อมูลสต็อกสินค้าได้ชั่วคราว กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองใหม่อีกครั้ง"` ไปยังหน้าเว็บแทน
  - ติดตั้ง **Global Express Error Handler (`app.use((err, req, res, next) => ...)`** และตัวดักจับระดับโปรเซสของ Node.js (**`process.on('unhandledRejection')` และ `process.on('uncaughtException')`**) เพื่อรับประกัน 100% ว่าหากเกิดข้อผิดพลาดใดๆ นอกเหนือความคาดหมาย ระบบเซิร์ฟเวอร์ที่พอร์ต 4000 จะบันทึกล็อก (`console.error`) และยังคงเปิดทำงานต่อไปได้โดยไม่ดับ (`No crash / No exit`) ทำให้เมื่อสัญญาณอินเทอร์เน็ตกลับมาเป็นปกติ ผู้ใช้งานแค่กดรีเฟรชหน้าเว็บก็สามารถกลับมาใช้งานได้ทันที

## 10 ก.ค. 2026
- **แก้ไขปัญหาระบบฐานข้อมูลไม่เชื่อมต่อ (`Can't reach database server / Prisma Pool Exhaustion`) อย่างถาวร และรีสตาร์ทระบบให้กลับมาใช้งานได้ทันที 100%**:
- **ปรับสีในเมนู Custom Vector Popover (`Category Dropdown`) ให้เป็นโทนสีเดียวกันทั้งหมด (`Unified Monochromatic Slate Tone`) โดยไม่เปลี่ยนดีไซน์หรือโครงสร้างอื่น**:
- **อัปเกรดตัวเลือกหมวดหมู่สินค้า (`Category Dropdown`) จากปุ่ม `<select>` ธรรมดาที่มีอิโมจิ ให้เป็น Custom Vector Popover ที่มีความมินิมอลและทันสมัยขั้นสุด**:
- **นำกล่องตัวเลือกมุมมอง (`View Mode Dropdown`) ออกจากหน้าจัดการสต็อกสินค้า (`Stock Page`) ตามคำสั่งของผู้ใช้**:
- **ปรับเปลี่ยนแถบเลือกหมวดหมู่สินค้า (`Category Filter`) ทางด้านซ้าย จากปุ่มแยก ให้เป็นกล่องตัวเลือกแบบ Dropdown (`Select Box`) โค้งมนสไตล์เดียวกับกล่องตัวเลือกมุมมอง**:
- **เปลี่ยนปุ่มแสดงมุมมอง (`View Mode Badge`) ด้านขวาของแถบคัดกรอง ให้เป็นกล่องตัวเลือกแบบ Dropdown (`Select Box`) ตามดีไซน์หน้าการเลือกบอกสถานะของหน้ารายงาน**:
- **ปรับโทนสีปุ่มแถบคัดกรองหมวดหมู่สินค้า (`Category Tabs`) ให้มีความมินิมอลและเป็นโทนสีเดียวกันทั้งหมด (`Unified Monochromatic Minimalist System`)**:
- **อัปเกรดดีไซน์แถบคัดกรองหมวดหมู่สินค้า (`Category Tabs`) จากอิโมจิธรรมดาให้เป็นปุ่ม Vector Icon สไตล์ Modern Glassmorphic Pill Bar**:
- **อัปเกรดระบบแถบคัดกรองหมวดหมู่สินค้า (`Bulk`, `Packaging`, `Raw Material`) ในหน้าจัดการสต็อกให้แสดงข้อมูลครบถ้วนพร้อมแยกแต่ละส่วนอย่างชัดเจน 100%**:
- **นำดีไซน์ตารางรายการ (`Table View`) ออกจากหน้าจัดการสต็อกสินค้า (`/inventory`)**:
- **อัปเกรดระบบดาวน์โหลดรูปภาพ QR Code ในหน้าจัดการสต็อกให้เสถียรและแม่นยำ 100% (`downloadQRCodeAsPNG`)**:
- **ปรับปรุงระบบจัดการข้อผิดพลาดการเชื่อมต่อเซิร์ฟเวอร์ และแก้ไขปัญหาเซิร์ฟเวอร์หลังบ้านหยุดทำงาน (`Crash / Connection Refused`)**:
- **ปรับปรุงดีไซน์หน้าจัดการสต็อกสินค้า (`/inventory`) ครั้งใหญ่ เพื่อแก้ปัญหาระบบดูงงและแยกข้อมูลไม่ชัดเจน**:
- **แก้ไขปัญหาข้อผิดพลาด `TypeError: Failed to fetch` ที่หน้าเข้าสู่ระบบ (`/login`)**:
- **ปรับปรุงหน้าจัดการสต็อกสินค้า (`/inventory`) ให้แสดงและจัดเรียงรหัสสินค้าหลัก (`Item 1` จาก Sheet 3) ขึ้นเป็นอันดับแรกสุด พร้อมเพิ่มคอลัมน์ "รหัสหลัก (Item 1)" ในตาราง**:
- **ปรับปรุงขั้นตอนการเข้าสู่ระบบ ให้บังคับลงทะเบียนก่อนเข้าใช้งานระบบสำหรับผู้ใช้ใหม่ตามความต้องการ**:
- **แก้ไขปัญหาข้อผิดพลาด `500 Internal server error` ในหน้าเข้าสู่ระบบ (`/login`) จากปัญหาเครือข่ายบล็อกพอร์ตฐานข้อมูล**:
- **ปรับระบบให้สามารถเข้าใช้งานหน้าเว็บได้ทันทีโดยไม่ต้องจำกัดสิทธิ์หรือบังคับเข้าสู่ระบบ (Open Access)**:
- **เชื่อมต่อและนำข้อมูล Master Data ใหม่พร้อมสูตรการผลิต (SAP BOM) มาแสดงผลในระบบจริงอย่างครบถ้วน**:

## 9 ก.ค. 2026
- **ออกแบบและอัปเดตฐานข้อมูลรองรับสูตรการผลิต (BOM จาก SAP Sheet 3)**:

## 2 ก.ค. 2026
- **เพิ่มฟีเจอร์คัดกรองข้อมูลตามวันที่ในรายงานธุรกรรม**:
- **ปรับปรุงหน้าจัดการสต็อกสินค้า (`app/inventory/page.tsx`)**:
- **รีดีไซน์หน้ารายงานธุรกรรม (`app/reports/page.tsx`)**:
- **เพิ่มปุ่มและระบบเพิ่มรายการสินค้าในหน้าจัดการสต็อก (`app/inventory/page.tsx`)**:
- **เพิ่มคอลัมน์และปุ่ม "ลบ" ในหน้าจัดการสต็อกสินค้า (`app/inventory/page.tsx`)**:





## 26 มิ.ย. 2026
- **รีดีไซน์หน้าหลัก (Apple Style)**: เปลี่ยนหน้าจอหลัก (`app/page.tsx`) เป็นสไตล์ Apple ด้วยดีไซน์ Liquid Glass (กระจกใสฝ้า), เปลี่ยนปุ่มและสีหลักเป็นสีโทนดำ/เทาเข้มแบบ Premium Neutral, พร้อมเพิ่มแอนิเมชันแบบสปริงและการ Fade-up ด้วย `framer-motion`
- **เพิ่มฟังก์ชันเพิ่มรายการสินค้า (Add New Item)**: 
- **แก้ไขปัญหา Hydration Mismatch (Next.js)**: ปรับปรุงการดึงข้อมูล `localStorage` ใน `app/page.tsx` และ `app/providers.tsx` ให้อยู่ใน `useEffect` เพื่อป้องกันปัญหาการเรนเดอร์ที่ไม่ตรงกันระหว่าง Server และ Client
- **แก้ไขบั๊ก Quantity เป็น 0 (Supabase)**: อัปเดตสคริปต์ `backend/src/import_stock.ts` ให้จัดการกับปัญหาหัวคอลัมน์ Excel ที่มีช่องว่างส่วนเกิน (เช่น `' Total '`) เพื่อให้ดึงข้อมูลคอลัมน์ Total มาอัปเดตจำนวนสินค้าได้อย่างถูกต้อง
- **เพิ่มฟีเจอร์ Camera QR Scanner**: อัปเดตหน้า `/scan` ให้สามารถเปิดกล้องมือถือ/เว็บแคมสแกน QR Code ได้โดยตรง

## 25 มิ.ย. 2026
- **Apple UI Redesign (Liquid Glass)**: เปลี่ยนดีไซน์หน้าเว็บ (Login & Register) ให้เป็นสไตล์ Apple Design System (Minimalist) พร้อมเอฟเฟกต์ Liquid Glass
- **Claude UI Redesign**: เปลี่ยนดีไซน์หน้าเว็บ (Login & Register) ให้เป็นสไตล์ Claude Design System
- **Nike UI Redesign**: ปรับปรุงหน้า Login และ Register ให้เป็นไปตาม Nike Design System
- **สร้างโปรแกรม Desktop Pet**: พัฒนาสคริปต์ `desktop_pet.py` ด้วย PyQt5 เพื่อดึงตัวการ์ตูนแมวจาก `spritesheet.webp` และ `pet.json` มาวิ่งเล่นบนหน้าจอ Desktop ของผู้ใช้งาน
- **นำเข้าข้อมูล Stock จาก Excel**: สร้างสคริปต์ `backend/src/import_stock.ts` และนำเข้าข้อมูลสต็อกเริ่มต้นจากไฟล์ `stock eneos 30.05.26.xlsx` (ชีต "คงเหลือ") สำเร็จจำนวน 292 รายการเข้าสู่ตาราง Product โดยใช้วิธี Upsert เพื่อป้องกันการซ้ำซ้อน
- **ติดตั้ง html5-qrcode**: ติดตั้ง library `html5-qrcode` (v2.x) ใน `eneos-frontend` เพื่อรองรับฟีเจอร์การสแกน QR Code ด้วยกล้อง
- **สร้าง QrScanner Component**: สร้าง `components/QrScanner.tsx` ที่ใช้ `Html5Qrcode` เปิดกล้องผ่าน modal พร้อม overlay กรอบสแกนและเส้น scan เคลื่อนไหว

## 24 มิ.ย. 2026
- **UI Redesign**: ปรับปรุงหน้า Login (`app/login/page.tsx`) และ Register (`app/register/page.tsx`) ให้ตรงตามแผน "Apple-Style Liquid Glass"
- **Authentic Apple-Style Refinement**: ปรับแก้หน้า Login และ Register ตามคำแนะนำแบบ Apple HIG อย่างเคร่งครัด
- **UI UX Improvements**: เพิ่ม Framer Motion สำหรับ Animation (Stagger, Hover/Tap, Error Shake) และปรับ A11y (เพิ่ม sr-only label, autoComplete) ให้เป็น Apple-Style อย่างแท้จริง

## 24 June 2026
- **UX/UI หน้า Register/Login**: ปรับปรุง UI ใหม่ทั้งหมด ใช้ Floating Labels, Inline Validation, Password Strength Indicator และปุ่ม Show/Hide Password แบบ Apple-Style

## 26 June 2026
- **UI Clean & Minimal**:
- **Scanner UI Improvement**:

## 29 June 2026
- **Inventory & Quick Action UI Redesign**:

## 30 มิ.ย. 2026
- **Seamless & Immediate Action for Pending Transactions**:

- **จัดระเบียบโครงสร้างไฟล์และโฟลเดอร์:** สร้างโฟลเดอร์ scripts/ เพื่อย้ายไฟล์ Python, รูปภาพ, ไฟล์ Excel และ JSON ที่กระจัดกระจายอยู่ใน Root directory
- **ลบและเปลี่ยนชื่อโฟลเดอร์:** ลบโฟลเดอร์ rontend เก่า (Next.js v14 Pages Router) ทิ้ง และเปลี่ยนชื่อโฟลเดอร์ eneos-frontend เป็น rontend แทน
- **อัปเดต Configuration:** แก้ไขไฟล์ package.json และ AGENTS.md ให้ชี้ไปยังโฟลเดอร์ rontend ใหม่
- **ทำความสะอาดโปรเจกต์:** ลบไฟล์ dev-server.log ทิ้ง

- **ปรับปรุง Workflow วิศวกรรมซอฟต์แวร์:** ดึง Skills จาก Repository mattpocock/skills มาใช้ในโปรเจกต์ (เก็บใน .skill/) โดยเลือกเฉพาะสกิลที่เหมาะสม ได้แก่ tdd, code-review, to-spec, codebase-design, improve-codebase-architecture, grill-with-docs, diagnosing-bugs, และ implement

## 21 July 2026
- **ปรับปรุงการแสดงผลสิทธิ์และชื่อบทบาทผู้ใช้**:
  - เปลี่ยนคำว่า "Supervisor" เป็น "ผู้ควบคุมดูแลระบบ (Supervisor)" และเปลี่ยน "พนักงานคลังสินค้า (Staff)" เป็น "พนักงานทั่วไป (Staff)" ทั้งในระบบนำเข้าข้อมูลเริ่มต้น (Seed Database), Mock Fallback API, และหน้าจอส่วนของ Dashboard / Navbar เพื่อให้สอดคล้องกันและเป็นมิตรต่อผู้ใช้งานมากขึ้น
- **ปรับปรุงดีไซน์หน้าสต็อกสินค้า (Inventory) เพื่อเน้นงาน Packaging**:
  - ตั้งค่าเริ่มต้นให้แสดงแท็บ "Packaging" ทันทีเมื่อเปิดหน้าจัดการสต็อกแทนแท็บ "ทั้งหมด (ALL)"
  - ปรับปรุงตรรกะการล้างตัวกรองค้นหา (Clear Search) ให้ระบบเด้งกลับมาโฟกัสที่แท็บ "Packaging" โดยอัตโนมัติ
  - เปลี่ยนรูปแบบการแสดงผลของสินค้าประเภท Packaging จากแบบตาราง (Table View) มาเป็นการ์ดขนาดใหญ่ (Card View) เหมือนหน้าสินค้าหลัก (FG) เพื่อความสวยงาม สอดคล้องของดีไซน์ระบบ และใช้งานสะดวกยิ่งขึ้น
  - เพิ่มปุ่ม "ดูรายละเอียด BOM" ให้กับรายการการ์ดสินค้าประเภท Packaging

## 22 July 2026
- **วิเคราะห์และแก้ไขปัญหา Deployment Build Failed บน Vercel และ Render**:
  - **สาเหตุของปัญหา**:
    1. **Vercel Build Error (Frontend)**: เกิดจาก TypeScript Type Error ใน `frontend/app/inventory/page.tsx` (การเปรียบเทียบ `activeTab !== 'Packaging'` เมื่อ type ถูก narrow เป็น `'Bulk' | 'Raw Material'`) และใน `frontend/app/scan/page.tsx` (การเรียก `p.description` ซึ่งไม่มีใน interface `Product` โดยที่ถูกต้องคือ `p.name`) ทำให้คำสั่ง `next build` ล้มเหลว (`exit status 1`) ส่งผลให้ Vercel ไม่สามารถ Deploy เวอร์ชันใหม่ได้ และคงหน้าเว็บเดิมไว้
    2. **Render Build Error (Backend)**: เกิดจาก `backend/tsconfig.json` ไม่มีพร็อพเพอร์ตี้ `"include"` ทำให้ `tsc` ไปรวมไฟล์ในโฟลเดอร์ `__tests__` และ `vitest.config.ts` ซึ่งอยู่นอก `src` (`rootDir`) เกิดข้อผิดพลาด `TS6059` ส่งผลให้การ Build บน Render ล้มเหลว
  - **การแก้ไข**:
    - แก้ไข TypeScript Type Mismatch ใน `frontend/app/inventory/page.tsx` และ `frontend/app/scan/page.tsx` ให้ถูกต้อง
    - อัปเดต `backend/tsconfig.json` โดยเพิ่ม `"include": ["src/**/*"]` และ `"exclude": ["node_modules", "dist", "__tests__"]`
    - สร้างไฟล์ `backend/__tests__/tsconfig.json` เพื่อรองรับไฟล์ทดสอบและ `vitest.config.ts` ป้องกันปัญหา TypeScript Language Server ใน IDE (แถบ Problems) แจ้งเตือนข้อความตกค้าง
    - ทดสอบรัน `npm run build` ทั้ง frontend และ backend รวมถึงรัน unit tests (`vitest`) ผลการทดสอบผ่าน 100% พร้อมสำหรับ Commit & Push ขึ้น GitHub เพื่อให้ Vercel และ Render Deploy อัตโนมัติอีกครั้ง
- **ปรับปรุงดีไซน์หน้าจัดการสต็อกให้โฟกัสเฉพาะ Packaging (Packaging Stock Redesign) และอัปเกรดระบบสแกน View-Only สำหรับสินค้ากลุ่มอื่น**:
  - **ปรับเปลี่ยนหน้าสต็อก (`frontend/app/inventory/page.tsx`)**:
    1. เปลี่ยนชื่อหน้าเป็น **"จัดการสต็อกบรรจุภัณฑ์ (Packaging Stock)"**
    2. ตัดแถบเลือกหมวดหมู่หลักเดิม (`ทั้งหมด`, `FG`, `Bulk`, `Raw Material`) ออกจากหน้าจัดการสต็อก เพื่อโฟกัสข้อมูลบรรจุภัณฑ์ 100%
    3. เพิ่มแถบการ์ดสรุปภาพรวมสถิติตัวเลข **Packaging Overview Banner** ด้านบนสุด แสดงยอดรวมบรรจุภัณฑ์ และยอดแยกตามประเภท (`แกลลอน`, `ฟอยล์`, `ฝา`, `กล่อง`, `อื่นๆ`)
    4. ยกแถบปุ่มตัวกรองหมวดหมู่ย่อยขึ้นมาเป็นแถบหลักด้านบน เพื่อเลือกกรองสินค้าบรรจุภัณฑ์แต่ละประเภทได้อย่างรวดเร็ว
    5. บนการ์ดบรรจุภัณฑ์แต่ละใบ ปรับให้มี 2 ปุ่มการทำงาน: `[📱 ดาวน์โหลด QR]` (ดาวน์โหลดรูปภาพ PNG ขนาด 600x600px) และ `[📋 ดูรายละเอียด BOM]` (เปิดดูรายการสินค้าหลัก FG ที่บรรจุภัณฑ์นี้ใช้งานอยู่)
    6. ปรับการ์ดสรุปตัวเลขสถิติภาพรวมบรรจุภัณฑ์ 6 หมวดหมู่ (`บรรจุภัณฑ์ทั้งหมด`, `แกลลอน`, `ฟอยล์`, `ฝา`, `กล่อง`, `อื่นๆ`) ให้เป็น **ปุ่มกดตัวกรองข้อมูลแบบโต้ตอบโดยตรง (Interactive Filter Cards)** โดยปรับการวางตัวเลขสถิติให้อยู่ตรงกลางสมดุลตรงกับไอคอนด้านบนแบบพอดี (Dead-Center Alignment) และวางข้อความหน่วย "รายการ" ไว้ตรงกลางด้านล่างอย่างเรียบหรู พร้อมใช้ **เส้นกรอบสีแดงพรีเมียมแบรนด์ ENEOS (`border-2 border-[#BE1111]`)** คมชัดสวยงามสไตล์ Apple Clean Slate

## 18 August 2026
- **พัฒนาระบบอนุมัติผู้ใช้งานใหม่โดย Supervisor (User Registration Approval Workflow)**:
  - **Database Schema**: เพิ่มฟิลด์ `status` (ค่าเริ่มต้น `'pending'`) ใน `model User` ใน `backend/prisma/schema.prisma` พร้อมรัน Prisma Migration และอัปเดตบัญชีผู้ใช้ Master Data ให้เป็น `'approved'`
  - **Backend API (`backend/src/index.ts`)**:
    - อัปเดต `/auth/register`: เมื่อมีผู้สมัครใหม่ บันทึกสถานะเป็น `'pending'` และสร้าง Notification แจ้งเตือนไปยัง Supervisor (Role: `admin`)
    - อัปเดต `/auth/login`: ตรวจสอบสถานะบัญชี (`status`) หากเป็น `pending` หรือ `rejected` จะส่ง HTTP 403 Forbidden พร้อมข้อความแจ้งเตือนสถานะชัดเจน
    - เพิ่ม Admin Endpoints: `GET /users` (ดึงรายชื่อผู้ใช้), `GET /users/pending` (ดึงผู้ใช้รออนุมัติ), `POST /users/:id/approve` (อนุมัติผู้ใช้งาน), `POST /users/:id/reject` (ปฏิเสธผู้ใช้งาน)
  - **Frontend (`eneos-frontend`)**:
    - อัปเดต `lib/auth.ts`: เพิ่มประเภทข้อมูล `UserItem`, `LoginResponse`, `RegisterResponse` และฟังก์ชัน `getUsers`, `approveUser`, `rejectUser`
    - หน้าลงทะเบียน (`frontend/app/register/page.tsx`): ปรับแต่งเมื่อสมัครสำเร็จให้นำผู้ใช้ไปหน้าล็อกอินพร้อมพารามิเตอร์แจ้งเตือนว่าสถานะอยู่ระหว่างรออนุมัติจาก Supervisor
    - หน้าเข้าสู่ระบบ (`frontend/app/login/page.tsx`): อัปเดต `LoginAlert` แสดงกล่องข้อความเตือนเมื่อบัญชีอยู่ระหว่างรอการอนุมัติ
    - หน้าอนุมัติและจัดการผู้ใช้งาน (`frontend/app/users/page.tsx`): สร้างหน้า UI สไตล์ Modern Clean สำหรับ Supervisor ในการดูรายการผู้สมัครใหม่ กรองสถานะ (`รออนุมัติ`, `อนุมัติแล้ว`, `ถูกปฏิเสธ`) และกดปุ่ม **"อนุมัติ"** หรือ **"ปฏิเสธ"**
    - เมนูนำทาง (`frontend/components/Navigation.tsx`): เพิ่มเมนู **"อนุมัติสมาชิก"** สำหรับสิทธิ์ Supervisor (`admin`)
  - **การทดสอบ**: ทดสอบรันคำสั่ง `npm run build` ผ่านสมบูรณ์ 100% ไร้ข้อผิดพลาด



## 8 September 2026
- **พัฒนาระบบแจ้งเตือนบรรจุภัณฑ์ใกล้หมดและจัดการจุดสั่งซื้อขั้นต่ำ (Low Stock Notification & Min Stock Management — STEP 4.15.3)**:
  - **ขอบเขตและเงื่อนไขทางธุรกิจ (Business Rules)**:
    - จำกัดขอบเขตเฉพาะสินค้ากลุ่มบรรจุภัณฑ์ (`itemType === 'Packaging'`) ที่มีสถานะใช้งานอยู่ (`status === 'active'`)
    - ใช้เงื่อนไขจุดสั่งซื้อขั้นต่ำ `quantity <= minStock` (โดย `quantity = 0` ถือเป็น Low Stock เช่นกัน)
    - หาก `minStock === null` จะไม่ตรวจสอบและไม่สร้างการแจ้งเตือน
    - ผู้รับการแจ้งเตือน: เฉพาะบทบาทหัวหน้างาน (`targetRole: 'supervisor'`) เท่านั้น (Admin และ Staff จะไม่ได้รับแจ้งเตือน `low_stock`)
  - **การตรวจจับการเปลี่ยนแปลงสถานะ (Edge-Triggered State Transition)**:
    - ระบบจะแจ้งเตือนเมื่อเกิดการลดลงของสต็อกจากปกติเข้าสู่เกณฑ์ต่ำเท่านั้น (`previousQty > minStock && nextQty <= minStock`)
    - ป้องกันการแจ้งเตือนซ้ำซ้อน (Duplicate Prevention): เมื่อสต็อกลดลงอีกขณะที่ต่ำกว่าเกณฑ์อยู่แล้ว (เช่น 10 -> 9) จะไม่สร้าง Notification ซ้ำ
    - เมื่อสต็อกได้รับการเติมกลับมาสูงกว่าเกณฑ์ (`nextQty > minStock`) จะถือว่ากลับสู่สถานะปกติ และพร้อมตรวจจับการตกสู่เกณฑ์ต่ำอีกครั้ง
  - **จุดทริกเกอร์ (Trigger Points) & ความปลอดภัยของธุรกรรม (Transaction Safety)**:
    - ตรวจสอบ Low Stock เมื่อ Supervisor กดยืนยันการเบิกสินค้า (`POST /transactions/:id/confirm`) หลังจากหักสต็อกและจัดสรร FIFO สำเร็จ
    - ตรวจสอบ Low Stock เมื่อ Supervisor ปรับปรุงจำนวนสต็อกโดยตรง (`PATCH /products/:id/quantity`)
    - การสร้าง Notification เป็น Non-Critical Side Effect: หากเกิดข้อผิดพลาดในการสร้าง Notification ระบบจะบันทึก Log และจะไม่ทำให้ Transaction หลักหรือการตัดสต็อกถูก Rollback เด็ดขาด
  - **การจัดการจุดสั่งซื้อขั้นต่ำ (Min Stock Management API)**:
    - เพิ่ม Endpoint `PATCH /products/:id/min-stock` อนุญาตเฉพาะ Supervisor
    - ตรวจสอบค่าความถูกต้อง: อนุญาตเฉพาะจำนวนเต็มบวกหรือศูนย์ (`Integer >= 0`) หรือ `null` (เพื่อปิดการแจ้งเตือน) หากเป็นทศนิยมหรือค่าลบจะส่งคืน HTTP 400
    - ป้องกันไม่ให้แก้ไขสินค้ากลุ่ม Non-Packaging (ส่งคืน HTTP 400)
    - อัปเดต `productSnapshot` ให้ส่งข้อมูล `minStock` กลับไปในทุก Endpoint ที่เกี่ยวข้อง
  - **การปรับปรุงหน้าเว็บ (Frontend UI & Navigation)**:
    - ในหน้าคลังสินค้าบรรจุภัณฑ์ (`frontend/app/inventory/page.tsx`): เพิ่มการแสดงผลกล่อง Min Stock ควบคู่กับยอดคงเหลือ, เพิ่ม Badge แจ้งเตือน `⚠️ ใกล้หมด`, และเพิ่มปุ่มพร้อม Modal สไตล์ Modern Glassmorphism สำหรับ Supervisor ในการกำหนดค่า Min Stock พร้อมระบบป้องกัน Double Submit
    - รองรับการกรองอัตโนมัติเมื่อกดลิงก์จากการแจ้งเตือน โดยอ่าน URL Query `search=[itemCode]` มากรองและเปิดดูข้อมูลได้ทันที
    - ปรับปรุงแถบนำทาง (`frontend/components/Navigation.tsx`): ให้ลิงก์การแจ้งเตือนประเภท `low_stock` นำทางไปยัง `/inventory?search=[itemCode]` อย่างถูกต้อง
  - **การทดสอบความถูกต้องและการป้องกันการถดถอย (Testing & Quality Assurance)**:
    - สร้างชุดทดสอบ Backend Integration Tests (`backend/__tests__/low-stock.test.ts`) ครอบคลุมทั้ง 20 กรณีทดสอบ (ผลการทดสอบผ่าน 20/20 รายการ)
    - ทดสอบ Backend Existing API Tests (`backend/__tests__/api.test.ts`) ผลการทดสอบผ่าน 31/31 รายการ
    - สร้างชุดทดสอบ Frontend Unit Tests (`frontend/__tests__/unit/low-stock.test.ts`) ผลการทดสอบผ่านครบ 50/50 รายการ
    - ทดสอบ Playwright E2E Tests ครบทุก Flow ผ่าน 18/18 รายการ
    - ตรวจสอบ Type Safety (`tsc --noEmit`) ทั้ง Frontend และ Backend ผ่าน 100% ไม่มีข้อผิดพลาด
    - ตรวจสอบความถูกต้องของฐานข้อมูล (Data Integrity): ข้อมูลเดิมทั้งหมด (Products, Packaging, ProductLots, Transactions, BOM, Users) ยังคงอยู่ครบถ้วน 100%

## 11 September 2026
- **พัฒนาหน้า Admin Dashboard สำหรับบทบาท Admin (STEP 4.51 — Admin Dashboard View)**:
  - พัฒนาหน้าแดชบอร์ดเฉพาะสำหรับ Role `admin` ใน `frontend/app/dashboard/page.tsx`
  - เพิ่มการเชื่อมโยงระบบนำทาง (Navigation) สำหรับ Admin: หน้าหลัก (`/`), จัดการผู้ใช้งาน (`/users`), แดชบอร์ด (`/dashboard`) โดยจัดลำดับให้แดชบอร์ดอยู่เป็นลำดับสุดท้าย
  - ปรับการ์ดหน้าหลัก (`frontend/app/page.tsx`) สำหรับ Admin ให้แสดงการ์ด "จัดการผู้ใช้งาน" และ "แดชบอร์ดระบบ"
  - สร้างชุดทดสอบ Unit Test ใน `frontend/__tests__/unit/dashboard.test.tsx` ตรวจสอบการแสดงผลและ Role Isolation

- **ปรับปรุงดีไซน์หน้า Admin Dashboard สไตล์ Modern SaaS / Enterprise (STEP 4.52 — Admin Dashboard UI Redesign)**:
  - **ดีไซน์และโครงสร้างภาพรวม (Layout & Visual Design)**:
    - ปรับปรุงเฉพาะส่วนของ Admin ภายใน `if (isAdmin)` ใน `frontend/app/dashboard/page.tsx` โดยไม่กระทบ Supervisor และ Staff Dashboard
    - ใช้ชุดสีเดิมของ WPK MMS: Primary Red (`#BE1111`), Dark Neutral (`#0F172A`), Background (`#F8FAFC`), Surface Cards (`#FFFFFF`), Text (`#0F172A`, `#64748B`), Status Emerald (`#10B981`), Amber (`#F59E0B`), Indigo (`#6366F1`), Rose (`#E11D48`)
  - **Header Section**:
    - แสดง Kicker Badge `SYSTEM ADMINISTRATION`, Title `Admin Dashboard`, Subtitle ภาพรวมระบบ, ป้ายวันที่ปัจจุบัน และปุ่ม Primary Action `[ จัดการผู้ใช้งาน ]` ลิงก์ไปยัง `/users`
  - **4 Summary Cards Grid**:
    1. ผู้ใช้งานทั้งหมด (Total Accounts) -> แสดงจำนวนบัญชีจริงจากระบบ
    2. บัญชีที่ใช้งานได้ (Active Status) -> แสดงจำนวนและเปอร์เซ็นต์บัญชีที่ใช้งานได้
    3. บัญชีที่ถูกระงับ (Restricted) -> แสดงจำนวนและเปอร์เซ็นต์บัญชีที่ถูกระงับ
    4. บทบาทในระบบ (Access Roles) -> แสดง 3 ระดับ (Admin, Supervisor, Staff)
  - **สัดส่วนผู้ใช้งานตามบทบาท (Users by Role with Pure SVG Donut Chart)**:
    - ออกแบบ Donut Chart ด้วย Pure Inline SVG แสดงตัวเลขรวมตรงกลาง พร้อมเส้นรอบวงจำแนกสีตามบทบาท (Admin: Crimson Red, Supervisor: Amber, Staff: Indigo)
    - แสดง Legend ด้านข้างพร้อมตัวเลขนับ เปอร์เซ็นต์ และ Mini Progress Bar
  - **สถานะระบบ (System Status)**:
    - แสดงสถานะ 4 บริการหลัก: Web Application (Online), API Gateway (Connected), Database Service (Connected), Role-Based Access (Enforced)
  - **สถานะผู้ใช้งานล่าสุด (Recent Users Table)**:
    - ตารางแสดงรายการผู้ใช้งาน 6 บัญชีล่าสุด พร้อมคอลัมน์ `#`, `ผู้ใช้งาน`, `รหัสพนักงาน`, `บทบาท`, `สถานะ`, `วันที่ลงทะเบียน`, และปุ่ม `[ จัดการ ]`
  - **การทดสอบความถูกต้อง (Verification & Testing)**:
    - TypeScript Typecheck (`tsc --noEmit`): 0 Errors
    - Frontend Unit Tests (`vitest`): 81/81 Passed (รวม `dashboard.test.tsx` 4/4 Passed)
    - Backend Tests (`vitest`): 79/79 Passed
    - Production Build (`next build`): 12/12 Static Routes Passed
    - Browser Smoke Test: ตรวจสอบการแสดงผลทั้ง Desktop (1280x800) และ Mobile (375x812) รวมถึง Role Isolation ของ Supervisor Dashboard

## 14 September 2026
- **ออกแบบและปรับปรุงหน้า Admin Dashboard ใหม่ตามบทบาทและความจำเป็น (Admin Role Dashboard Redesign)**:
  - **บทวิเคราะห์ความจำเป็นของข้อมูลสำหรับ Role Admin**:
    - คัดเลือกเฉพาะข้อมูลที่จำเป็นต่อการบริหารจัดการระบบและบัญชีผู้ใช้งาน (User & System Governance)
    - ยืนยันกระบวนการทำงานจริงของระบบ: เนื่องจากระบบปิดการรับสมัครสมาชิกสาธารณะ และมีเพียง Admin เท่านั้นที่เป็นผู้สร้างบัญชีเข้าใช้งานให้กับพนักงานโดยตรง บัญชีที่สร้างจึงพร้อมใช้งานทันทีและไม่มีขั้นตอนการ "รออนุมัติ (Pending Approvals)"
    - จึงตัดส่วนการ์ด "รอการอนุมัติ" และ Alert Banner ออก เพื่อไม่ให้แสดงข้อมูลที่เกินจำเป็นและไม่ตรงกับงานจริง
  - **การปรับปรุง UI/UX (Layout & Components ใน `frontend/app/dashboard/page.tsx`)**:
    - **Header & Action Bar**: คงหัวข้อ "แผงควบคุมระบบ (System Administration)", ป้ายวันที่, และปุ่มทางลัด "จัดการผู้ใช้งาน" (`/users`)
    - **3 Summary KPI Cards Grid (วาง 3 คอลัมน์สมดุล สะอาดตา)**:
      1. *ผู้ใช้งานทั้งหมด (Total Accounts)*: ไอคอน `Users` (โทนสีสเลท/คราม) แสดงจำนวนบัญชีจริงในระบบ (11 บัญชี)
      2. *บัญชีที่ใช้งานได้ (Active Status)*: ไอคอน `ShieldCheck` (โทนสีเขียวมรกต Emerald) แสดงจำนวนและเปอร์เซ็นต์บัญชีที่ใช้งานได้ (11 บัญชี, 100%)
      3. *บัญชีที่ถูกระงับ (Restricted)*: ไอคอน `ShieldAlert` (โทนสีสเลท/กุหลาบ) แสดงจำนวนและเปอร์เซ็นต์บัญชีที่ถูกระงับ (0 บัญชี, 0%)
    - **Users by Role (ผู้ใช้งานตามบทบาท)**: แสดง Pure Inline SVG Donut Chart พร้อมสัดส่วนและหลอดสถานะ 3 บทบาท (Admin: สีแดง WPK, Supervisor: สีส้มทอง Amber, Staff: สีน้ำเงินคราม Indigo)
    - **System Status (สถานะระบบ)**: สรุปความพร้อมของ 4 บริการหลัก (Web Application, API Gateway, Database Service, Access Control) พร้อม Badge "ระบบปกติ" แบบไม่มี Footer ส่วนเกิน
    - **Recent Users (สถานะผู้ใช้งานล่าสุด)**: ตารางแสดง 5 บัญชีล่าสุดแบบกะทัดรัด (Compact) อ่านง่าย พร้อม Badge สีตามสถานะจริง และปุ่มทางลัดเดียว "ดูผู้ใช้งานทั้งหมด →"
  - **การทดสอบความถูกต้อง (Testing & Verification)**:
    - TypeScript Typecheck (`tsc --noEmit`): 0 Errors
    - Frontend Unit Tests (`vitest`): ผ่านครบ 81/81 การทดสอบ (รวม `dashboard.test.tsx` 4/4 ผ่าน)
    - Production Build (`npm run build`): สำเร็จสมบูรณ์ 12/12 routes
    - Browser Inspection: ตรวจสอบผ่านเบราว์เซอร์ทั้ง Desktop (1440x900) และ Mobile (375x812) แสดงผลสวยงาม สะอาดตา สมดุล และไม่มี Horizontal Overflow
