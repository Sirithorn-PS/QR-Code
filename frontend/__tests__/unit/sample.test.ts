import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------
// ตัวอย่างที่ 1: การเทสต์ฟังก์ชันช่วยคำนวณ (Utility Function)
// ---------------------------------------------------------
// สมมติว่าในแอปเรามีฟังก์ชันคำนวณราคาสินค้ารวม VAT 7%
function calculatePriceWithVat(price: number): number {
  return price + (price * 0.07);
}

describe('Unit Test: ตรวจสอบการหาบัคในฟังก์ชันคำนวณ VAT', () => {
  it('ควรคำนวณราคาบวก VAT 7% ได้ถูกต้อง', () => {
    // วิธีเช็คบัค: เราส่งค่า 100 เข้าไป ผลลัพธ์ต้องได้ 107 เสมอ
    // ถ้าวันหน้ามีคนมาแก้โค้ดเป็น 0.08 (VAT 8%) บรรทัดนี้จะแจ้ง Error ทันที!
    expect(calculatePriceWithVat(100)).toBe(107);
  });

  it('ถ้าราคาสินค้าเป็น 0 ผลลัพธ์ต้องเป็น 0', () => {
    // ป้องกันบัคกรณีที่ระบบคำนวณเพี้ยนเมื่อค่าเป็นศูนย์
    expect(calculatePriceWithVat(0)).toBe(0);
  });
});

// ---------------------------------------------------------
// ตัวอย่างที่ 2: การเทสต์ตรรกะการคัดกรองข้อมูล (Logic Testing)
// ---------------------------------------------------------
// สมมติฟังก์ชันเช็คสถานะสต็อกสินค้า
function getStockStatus(quantity: number): string {
  if (quantity <= 0) return 'Out of Stock';
  if (quantity < 10) return 'Low Stock';
  return 'In Stock';
}

describe('Unit Test: ตรวจสอบการหาบัคในระบบเช็คสถานะสต็อก', () => {
  it('สินค้าจำนวน 0 หรือติดลบ ต้องขึ้น Out of Stock', () => {
    expect(getStockStatus(0)).toBe('Out of Stock');
    expect(getStockStatus(-5)).toBe('Out of Stock'); // เทสต์เผื่อกรณีบัคค่าติดลบ
  });

  it('สินค้าจำนวน 1 ถึง 9 ต้องขึ้น Low Stock', () => {
    expect(getStockStatus(5)).toBe('Low Stock');
    expect(getStockStatus(9)).toBe('Low Stock');
  });

  it('สินค้าจำนวน 10 ชิ้นขึ้นไป ต้องขึ้น In Stock', () => {
    expect(getStockStatus(10)).toBe('In Stock');
    expect(getStockStatus(100)).toBe('In Stock');
  });
});
