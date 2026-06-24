# ระบบ Authentication (Login & Register)

ระบบนี้มีการรองรับ login และ registration พื้นฐาน สำหรับผู้ใช้งานระบบสแกน QR

## ฟีเจอร์

- **ลงทะเบียน (Register)**: สร้างบัญชีใหม่โดยกรอก ชื่อ-นามสกุล, ชื่อผู้ใช้, และรหัสผ่าน
- **เข้าสู่ระบบ (Login)**: เข้าสู่ระบบด้วย ชื่อผู้ใช้ และรหัสผ่าน
- **JWT Token**: ระบบใช้ JWT สำหรับการยืนยันตัวตน
- **ค่าเริ่มต้น Role**: ผู้ใช้ใหม่จะได้ role `warehouse_staff` อัตโนมัติ
- **Password Hashing**: รหัสผ่านถูกเก็บในรูป hash ด้วย bcryptjs

## Setup

### Backend

1. ติดตั้ง dependencies:
```bash
cd backend
npm install
```

2. สร้างไฟล์ `.env`:
```bash
cp .env.example .env
```

3. ใส่ค่า `DATABASE_URL` และ `JWT_SECRET` ใน `.env`

4. รัน migrations:
```bash
npm run prisma:migrate
```

5. เริ่ม backend server:
```bash
npm run dev
```

Backend จะทำงานที่ `http://localhost:4000`

### Frontend

1. ติดตั้ง dependencies:
```bash
cd eneos-frontend
npm install
```

2. สร้างไฟล์ `.env.local`:
```bash
cp .env.local.example .env.local
```

3. เริ่ม frontend server:
```bash
npm run dev
```

Frontend จะทำงานที่ `http://localhost:3000`

## API Endpoints

### POST /auth/register
สร้างบัญชีใหม่

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "password123",
  "fullName": "John Doe"
}
```

**Response (201):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "fullName": "John Doe",
    "role": "warehouse_staff"
  }
}
```

### POST /auth/login
เข้าสู่ระบบ

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "fullName": "John Doe",
    "role": "warehouse_staff"
  }
}
```

## ระบบ Authentication Frontend

### การใช้ Auth Hook

```tsx
import { useAuth } from '@/app/providers'

export default function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth()

  if (!isAuthenticated) {
    return <div>Please login</div>
  }

  return (
    <div>
      <p>Welcome {user?.fullName}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### API Helper Functions

```tsx
import { login, register, logout, getToken } from '@/lib/auth'

// ลงทะเบียน
const response = await register({
  username: 'john_doe',
  password: 'password123',
  fullName: 'John Doe'
})

// เข้าสู่ระบบ
const response = await login({
  username: 'john_doe',
  password: 'password123'
})

// ออกจากระบบ
logout()

// ดึง token
const token = getToken()
```

## Pages

- `/login` - หน้าเข้าสู่ระบบ
- `/register` - หน้าลงทะเบียน
- `/` - หน้าแรก (ต้องเข้าสู่ระบบ)

## Database Schema

```prisma
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String
  fullName  String
  role      String   @default("warehouse_staff")
  createdAt DateTime @default(now())
}
```

## Error Handling

### Register Errors
- `400`: Missing required fields
- `409`: Username already exists
- `500`: Internal server error

### Login Errors
- `400`: Missing username or password
- `401`: Invalid credentials
- `500`: Internal server error

## Token Storage

Tokens และ user information ถูกเก็บใน `localStorage`:
- `token`: JWT token
- `user`: JSON stringified user object

## Security Notes

1. **CORS**: ปัจจุบันไม่มี CORS configuration - ต้องเพิ่มเมื่อ production
2. **HTTPS**: ควรใช้ HTTPS ใน production เพื่อปกป้อง tokens
3. **Token Expiration**: Token หมดอายุใน 24 ชั่วโมง
4. **Refresh Token**: ควรเพิ่ม refresh token mechanism ในอนาคต
5. **Password**: ต้องการการตรวจสอบรหัสผ่านที่แข็งแกร่ง

## Future Enhancements

- [ ] Email verification
- [ ] OTP authentication
- [ ] Refresh token mechanism
- [ ] Password reset
- [ ] 2FA (Two-factor authentication)
- [ ] Role-based access control (RBAC)
- [ ] OAuth integration
- [ ] Rate limiting for auth endpoints
