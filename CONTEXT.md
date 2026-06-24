# CONTEXT — ระบบสแกน QR สำหรับรับ/จ่ายสินค้า

วัตถุประสงค์:
- ลดความผิดพลาดจากการบันทึกสต็อกด้วยมือ และอัพเดทสต็อกให้อัตโนมัติ

ผู้ใช้หลัก:
- `warehouse_staff`: สแกนสินค้า สร้างรายการรอการยืนยัน
- `manager`: ตรวจสอบ/อนุมัติรายการ ปรับสต็อก และสร้างบัญชีผู้ใช้

การยืนยันตัวตน (Auth):
- วิธีเริ่มต้น: `username` + `password`
- ผู้ใช้สมัครเอง (self-register) โดยต้องกรอก `username`, `password`, `fullName`
- ไม่ใช้การยืนยันอีเมลในเฟสแรก
- ค่าเริ่มต้น role = `warehouse_staff`

รูปแบบข้อมูลสินค้า (display mapping):
- `itemCode`: 7530010083
- `unit`: GALLON
- `productId`: 10001784
- `name`: 3L. Premium Synthetic Oil 0W-20 Gallon3L
- `quantity`: จำนวนคงเหลือ/รายการ เช่น 5

QR mapping:
- QR ระดับสินค้า (SKU) เป็นค่าเริ่มต้น
- รองรับการเพิ่ม `lot`/`serial`/`location` ได้ในอนาคต แต่ไม่บังคับในเฟสแรก

พฤติกรรมการสแกน (Scan flow):
- การสแกนจะเก็บเป็นรายการ "รอการยืนยัน" (pending)
- ผู้ใช้เลือกประเภทธุรกรรม (รับเข้า / จ่ายออก) และจำนวน แล้วกดยืนยันเพื่ออัพเดทสต็อกจริง
- สามารถเพิ่มโหมดด่วน (auto-confirm) ในอนาคตถ้าต้องการ

Audit / Logging:
- บันทึกทุกธุรกรรมพร้อม `user`, `timestamp`, `status` (pending/confirmed), และ snapshot ของ item

เทคโนโลยี:
- Frontend: Next.js + Tailwind CSS (+ shadcn UI เมื่อติดตั้ง)
- Backend: Node.js + TypeScript + Prisma
- Database: Supabase (Postgres)

การตัดสินใจที่ยังรอ (open decisions):
- การยืนยันด้วยอีเมลหรือ OTP
- การสนับสนุน lot/serial แบบเต็มรูปแบบ
- นโยบายการอนุมัติ (manager ต้องอนุมัติหรือ manager สามารถตั้งให้ auto-approve)
