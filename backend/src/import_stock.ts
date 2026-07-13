import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('เริ่มการอ่านไฟล์ Excel...');
  const filePath = path.join(__dirname, '../../stock eneos 30.05.26.xlsx');
  
  // อ่านไฟล์ Excel
  const workbook = xlsx.readFile(filePath);
  
  // ระบุชื่อชีต "คงเหลือ"
  const sheetName = 'คงเหลือ';
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    console.error(`ไม่พบชีตชื่อ "${sheetName}"`);
    process.exit(1);
  }

  // แปลงข้อมูลเป็น JSON
  const rawData = xlsx.utils.sheet_to_json<any>(worksheet);
  console.log(`พบข้อมูลจำนวน ${rawData.length} แถว (ก่อนจัดกลุ่ม)`);

  // สร้าง Map เพื่อรวมข้อมูล Item Code ที่ซ้ำกัน
  const productMap = new Map<string, {
    itemCode: string;
    description: string;
    unit: string;
    quantity: number;
  }>();

  for (const row of rawData) {
    // ข้ามแถวที่ไม่มี Item Code
    if (!row['Item Code']) continue;
    
    // แปลงให้เป็น string เสมอเพื่อความชัวร์ (บางที Excel อ่านมาเป็นตัวเลข)
    const itemCode = String(row['Item Code']).trim();
    const description = row['Dscription'] ? String(row['Dscription']).trim() : '';
    const unit = row['Unit'] ? String(row['Unit']).trim() : '';
    
    // ค้นหา key ที่มีคำว่า Total หรือ Quantity
    const totalKey = Object.keys(row).find(k => {
      const lower = k.trim().toLowerCase();
      return lower === 'total' || lower === 'quantity';
    });
    const quantity = totalKey ? Number(row[totalKey]) || 0 : 0;

    if (productMap.has(itemCode)) {
      // ถ้ามีแล้ว ให้บวกจำนวนเพิ่ม
      const existing = productMap.get(itemCode)!;
      existing.quantity += quantity;
      productMap.set(itemCode, existing);
    } else {
      // ถ้ายังไม่มี ให้เพิ่มใหม่
      productMap.set(itemCode, {
        itemCode,
        description,
        unit,
        quantity
      });
    }
  }

  const productsToImport = Array.from(productMap.values());
  console.log(`จะนำเข้าข้อมูลสินค้าที่ไม่ซ้ำกันจำนวน ${productsToImport.length} รายการ`);

  // ทำการบันทึกข้อมูลลงฐานข้อมูลผ่าน Prisma
  let successCount = 0;
  let errorCount = 0;

  for (const product of productsToImport) {
    try {
      await prisma.product.upsert({
        where: { itemCode: product.itemCode },
        update: {
          description: product.description || undefined,
          unit: product.unit || undefined,
          quantity: product.quantity, // อัปเดตสต็อกล่าสุด
          // ไม่ได้ระบุ warehouse/location มา เลยไม่ไปทับค่าเดิม
        },
        create: {
          itemCode: product.itemCode,
          description: product.description || '-',
          unit: product.unit || '-',
          warehouse: '-', // default
          location: '-', // default
          quantity: product.quantity
        }
      });
      successCount++;
    } catch (err) {
      console.error(`เกิดข้อผิดพลาดกับ Item Code: ${product.itemCode}`, err);
      errorCount++;
    }
  }

  console.log('การนำเข้าข้อมูลเสร็จสิ้น!');
  console.log(`สำเร็จ: ${successCount}`);
  console.log(`ผิดพลาด: ${errorCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
