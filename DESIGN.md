# Design System

## Visual Theme & Brand Identity

การออกแบบ UI ของแอปพลิเคชันใช้แนวคิด **"Modern Minimalist & Liquid Glass" (สไตล์ Apple)** เน้นความเรียบหรู ทันสมัย และมีมิติที่โปร่งแสง 
โลโก้ของบริษัทจะเป็นจุดเด่นสำคัญ โดย UI ส่วนใหญ่จะเป็นโทนสีกลาง (Neutral) เพื่อให้เนื้อหาและโลโก้โดดเด่นขึ้นมา

ทิศทางหลักคือ:
- **Liquid Glassmorphism**: ใช้พื้นผิวกึ่งโปร่งใส (Translucent surfaces) พร้อมเอฟเฟกต์พื้นหลังเบลอ (Backdrop Blur) บนการ์ด, แถบนำทาง, และ Modal
- **Clean Minimalism**: ใช้พื้นที่ว่าง (Whitespace) ในการจัดโครงสร้าง ลดทอนเส้นขอบที่ไม่จำเป็น
- **Subtle Gradients & Soft Shadows**: ใช้แสงเงาที่นุ่มนวลและการไล่สีอ่อนๆ เพื่อสร้างความลึก (Depth) อย่างเป็นธรรมชาติ

---

## Design Tokens (Color Palette in OKLCH)

เน้นโครงสร้างสีแบบ Monochromatic (ขาว/เทา/ดำ) เป็นหลัก และใช้สีพิเศษเฉพาะส่วนสำคัญ เพื่อให้เข้ากับสไตล์ Apple:

| บทบาทสี (Role) | สีเชิงทัศนศิลป์ | ค่าสี OKLCH | คำแนะนำการใช้งาน |
| :--- | :--- | :--- | :--- |
| **Background / Canvas**| Off-White / Light Gray | `oklch(98% 0.002 250)` | พื้นหลังหลักของหน้าจอทั้งหมด ค่อนไปทางขาวเทาอ่อนๆ |
| **Glass Surface** | Translucent White | `oklch(100% 0 0 / 0.7)` | พื้นผิวแบบกระจกสำหรับการ์ดหรือแถบเครื่องมือ (ใช้คู่กับ `backdrop-blur`) |
| **Foreground / Ink** | Deep Charcoal | `oklch(20% 0.01 250)` | สีตัวหนังสือหลักเพื่อให้ Contrast สูงและอ่านสบายตา |
| **Muted Text** | Slate Gray | `oklch(60% 0.01 250)` | สีตัวหนังสือรองสำหรับคำอธิบายหรือข้อมูลที่ไม่สำคัญมาก |
| **Primary Accent** | Deep Blue/Black | `oklch(30% 0.05 250)` | สีเน้นหลัก เช่น ปุ่ม Call to Action (อ้างอิงจากสีโลโก้ หรือใช้ดำ/เทาเข้มเพื่อความมินิมอล) |
| **Glass Border** | Subtle Frost | `oklch(100% 0 0 / 0.2)` | สีของเส้นขอบบนพื้นผิวกระจก เพื่อเพิ่มมิติแสงตกกระทบ |
| **Success** | Apple Green | `oklch(65% 0.15 145)` | สีเขียวสว่างนุ่มนวล สำหรับสถานะสำเร็จหรือผ่านการอนุมัติ |
| **Danger / Error** | Coral Red | `oklch(60% 0.18 25)` | สีแดงอ่อนสำหรับข้อผิดพลาดหรือการยกเลิก |

---

## Typography

ใช้ฟอนต์ตระกูล Sans-Serif ที่ดูทันสมัย สะอาดตา:
- **หลักการจับคู่ฟอนต์**: ใช้ `Inter` (หรือเทียบเท่า San Francisco) สำหรับระบบทั้งหมด ทั้งอังกฤษและไทย เพื่อให้ได้ความรู้สึกแบบ Apple
- **มาตราส่วนขนาดอักษร (Scale)**:
  - **Display / Hero**: `clamp(2rem, 5vw, 3rem)` (letter-spacing: `-0.03em`, weight: `semibold`)
  - **Section Headings (H1/H2)**: `1.5rem (24px)` ถึง `1.75rem (28px)` (weight: `semibold`, letter-spacing: `-0.01em`)
  - **Body Text**: `1rem (16px)` (line-height: `1.5`, `text-wrap: pretty`)
  - **Caption / Metadata**: `0.875rem (14px)` (weight: `regular`, color: Muted Text)

---

## Layout & Component Rules

### 1. Liquid Glass Components
- **Cards & Modals**: ใช้พื้นหลังโปร่งแสง (เช่น `bg-white/70` ใน Tailwind) พร้อมเอฟเฟกต์เบลอ (`backdrop-blur-xl`) และเส้นขอบจางๆ (`border border-white/20`) เพื่อให้ดูคล้ายกระจก
- **Shadows**: ใช้ Drop shadow ที่มีความเบลอสูงและจางมาก (เช่น `shadow-xl shadow-black/5`) เพื่อให้การ์ดดูลอยขึ้นมาจากพื้นหลังเล็กน้อย

### 2. Touch Targets & Shapes
- **ขนาดขั้นต่ำ**: ปุ่มและฟิลด์อินพุตทั้งหมดต้องมีความสูงขั้นต่ำ **48px** บนหน้าจอมือถือ
- **ความโค้งมน (Radii)**: ใช้รัศมีมุมที่โค้งมนเป็นพิเศษ (Apple-like "squircle" feel) 
  - ปุ่มและอินพุต: `12px` ถึง `16px` หรือ `full` (pill shape)
  - การ์ดและ Modal: `20px` ถึง `24px`

### 3. Spacing Grid
ใช้พื้นที่ว่าง (Whitespace) ให้เป็นประโยชน์ ไม่ให้ UI ดูอึดอัด:
- `8px` (XS): ระยะห่างส่วนประกอบย่อย
- `16px` (S): ระยะห่างรอบข้างภายในการ์ดขนาดเล็ก (Card Padding) หรือช่องว่างระหว่างอินพุต
- `24px` (M): ระยะห่างระหว่างกลุ่มข้อมูล
- `32px` (L) ถึง `48px` (XL): ระยะขอบข้างของหน้ารายการ (Page Padding) บนหน้าจอใหญ่

### 4. Logo Integration
- โลโก้แบรนด์ (`dddd.png`) จะถูกจัดวางให้อยู่ในตำแหน่งที่โดดเด่น เช่น กึ่งกลางหน้า Login หรือมุมซ้ายบนของ Navbar โดยมีการจัดสรรพื้นที่รอบโลโก้ (Clear space) ให้เหมาะสม ไม่ถูกองค์ประกอบอื่นเบียดบัง

---

## Motion & Micro-interactions

การเคลื่อนไหวที่นุ่มนวลและเป็นธรรมชาติคือหัวใจของสไตล์ Apple:
- **Smooth Transitions**: การเปลี่ยนสถานะของปุ่ม (Hover/Active) ควรมี transition นุ่มนวล เช่น การจางลงเล็กน้อยเมื่อกด (Opacity fade) หรือเปลี่ยนขนาดเล็กน้อย (`scale-95` on active)
- **Spring Physics**: แอนิเมชันเปิด/ปิด Modal หรือ Bottom Sheet ควรใช้ Easing แบบ Spring (มีการเด้งกลับเล็กน้อย) เพื่อความรู้สึกลื่นไหลและมีชีวิตชีวา
- **Liquid Reveal**: การโหลดข้อมูลใหม่หรือการเปิดหน้าจอให้ใช้การ Fade in ร่วมกับการเลื่อนขึ้นเล็กน้อย (Fade up) ด้วยความเร็วประมาณ 300ms
