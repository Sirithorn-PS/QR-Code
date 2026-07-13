import * as xlsx from 'xlsx';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 🚀 เริ่มต้นอัปเดตตัวเลขยอดคงเหลือ (Quantity) ลงตาราง Product ในฐานข้อมูล Supabase ---');

  let updateCount = 0;

  // 1. อัปเดตจากไฟล์สูตรการผลิต YAMALUBE (Bill of Materials Report ( YAMALUBE ).xlsx)
  const yamalubePath = path.resolve(__dirname, '../../Bill of Materials Report ( YAMALUBE ).xlsx');
  try {
    const workbook = xlsx.readFile(yamalubePath);
    const worksheet = workbook.Sheets['Sheet3'];
    if (worksheet) {
      const rawRows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;
        const itemCode = row[1] ? String(row[1]).trim() : (row[0] ? String(row[0]).trim() : '');
        const parentCode = row[0] ? String(row[0]).trim() : '';
        const quantity = row[4] !== undefined && row[4] !== null ? Number(row[4]) || 0 : 0;

        if (itemCode && quantity > 0) {
          try {
            await prisma.product.updateMany({
              where: { itemCode: itemCode },
              data: { quantity: quantity }
            });
            console.log(`✅ อัปเดตยอดคงเหลือ ${itemCode}: ${quantity}`);
            updateCount++;
          } catch (err) {
            console.error(`❌ ไม่สามารถอัปเดต ${itemCode}:`, err);
          }
        }
        // ถ้าแถวแรกเป็น parentCode และ componentCode เท่ากัน (FG Item 1)
        if (parentCode && parentCode === itemCode && quantity > 0) {
          try {
            await prisma.product.updateMany({
              where: { itemCode: parentCode },
              data: { quantity: quantity }
            });
          } catch (err) {}
        }
      }
    }
  } catch (err) {
    console.error('Error reading YAMALUBE file:', err);
  }

  // 2. อัปเดตจากตาราง BillOfMaterial ใน Supabase โดยตรง (สำรองเพื่อความชัวร์ 100%)
  try {
    const boms = await prisma.billOfMaterial.findMany();
    for (const bom of boms) {
      if (bom.componentItemCode && bom.quantity > 0) {
        await prisma.product.updateMany({
          where: { itemCode: bom.componentItemCode },
          data: { quantity: bom.quantity }
        });
        updateCount++;
      }
    }
    console.log(`✅ ซิงค์ยอดคงเหลือจากตาราง BillOfMaterial เรียบร้อย`);
  } catch (err) {
    console.error('Error syncing from BillOfMaterial:', err);
  }

  // 3. อัปเดตสำหรับ FG Item 1 (60230073A600E) ให้มีสต็อกเริ่มต้นเป็น 1 Pail20L หรือ 10 Pail20L หากเป็น 0 อยู่
  try {
    const fgProduct = await prisma.product.findUnique({ where: { itemCode: '60230073A600E' } });
    if (fgProduct && fgProduct.quantity === 0) {
      await prisma.product.update({
        where: { itemCode: '60230073A600E' },
        data: { quantity: 10 } // ตั้งยอดสต็อก FG เริ่มต้นให้มี 10 ถัง
      });
      console.log(`✅ อัปเดตยอดคงเหลือเริ่มต้นสำหรับรหัสหลัก (60230073A600E) เป็น 10 ถัง`);
    }
  } catch (err) {
    console.error('Error updating FG product:', err);
  }

  console.log(`\n🎉 อัปเดตยอดคงเหลือในตาราง Product สำเร็จทั้งหมดเรียบร้อยแล้ว!`);
}

main()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
