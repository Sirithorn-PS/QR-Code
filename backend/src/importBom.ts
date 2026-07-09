import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('--- เริ่มการอ่านไฟล์ Excel (BOM ของ YAMALUBE) ---');
  
  // ระบุพาธของไฟล์ Excel ที่ต้องการ Import
  const filePath = path.resolve(__dirname, '../../Bill of Materials Report ( YAMALUBE ).xlsx');
  
  // โหลดไฟล์ Excel
  const workbook = xlsx.readFile(filePath);
  
  // เลือกชีตที่ 3 ตามที่ออกแบบไว้ (Sheet3)
  const sheetName = 'Sheet3';
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    console.error(`❌ ไม่พบชีตชื่อ "${sheetName}" ในไฟล์ Excel`);
    process.exit(1);
  }

  // อ่านข้อมูลในชีตเป็น Array ของแถว ( Array of Array ) เพื่อให้จัดการคอลัมน์ได้แม่นยำ
  const rawRows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(`📊 พบข้อมูลทั้งหมด ${rawRows.length - 1} แถว (ไม่รวมหัวตาราง)`);

  // จัดกลุ่มข้อมูล BOM ตามรหัสสินค้าหลัก (parentItemCode)
  const bomsByParent = new Map<string, Array<{
    parentCode: string;
    componentCode: string;
    description: string;
    uom: string;
    quantity: number;
    warehouse: string;
    depth: number;
    bomType: string;
  }>>();

  // วนลูปอ่านทีละแถว เริ่มจากแถวที่ 2 (index 1) เป็นต้นไป
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const parentCode = row[0] ? String(row[0]).trim() : '';
    const componentCode = row[1] ? String(row[1]).trim() : '';
    
    // ข้ามแถวที่ไม่มีรหัสสินค้าหลักหรือรหัสส่วนประกอบ
    if (!parentCode || !componentCode) continue;

    const description = row[2] ? String(row[2]).trim() : '-';
    const uom = row[3] ? String(row[3]).trim() : '-';
    const quantity = row[4] !== undefined && row[4] !== null ? Number(row[4]) || 0 : 0;
    const warehouse = row[5] ? String(row[5]).trim() : '-';
    const depth = row[7] !== undefined && row[7] !== null ? Number(row[7]) || 1 : 1;
    const bomType = row[8] ? String(row[8]).trim() : 'N';

    if (!bomsByParent.has(parentCode)) {
      bomsByParent.set(parentCode, []);
    }

    bomsByParent.get(parentCode)!.push({
      parentCode,
      componentCode,
      description,
      uom,
      quantity,
      warehouse,
      depth,
      bomType
    });
  }

  console.log(`📦 พบรหัสสินค้าสำเร็จรูป (Parent FG) ที่ไม่ซ้ำกันจำนวน ${bomsByParent.size} รายการ`);

  let importedParentCount = 0;
  let totalRowsInserted = 0;

  // วนลูปบันทึกลงฐานข้อมูล Supabase ทีละ Parent Product
  for (const [parentCode, components] of bomsByParent.entries()) {
    console.log(`⏳ กำลังนำเข้า BOM สำหรับสินค้า: ${parentCode} (${components.length} รายการ)...`);
    
    try {
      // 1. ลบข้อมูล BOM เดิมของสินค้านี้ออกก่อน (Replace by parentItemCode) เพื่อป้องกันสูตรซ้ำซ้อน
      await prisma.billOfMaterial.deleteMany({
        where: { parentItemCode: parentCode }
      });

      // 2. บันทึกรายการส่วนประกอบทั้งหมด (Depth 1-3) ลงไปในครั้งเดียว
      await prisma.billOfMaterial.createMany({
        data: components.map(comp => ({
          parentItemCode: comp.parentCode,
          componentItemCode: comp.componentCode,
          description: comp.description,
          uom: comp.uom,
          quantity: comp.quantity,
          warehouse: comp.warehouse,
          depth: comp.depth,
          bomType: comp.bomType
        }))
      });

      importedParentCount++;
      totalRowsInserted += components.length;
    } catch (err) {
      console.error(`❌ เกิดข้อผิดพลาดขณะนำเข้า BOM ของ ${parentCode}:`, err);
    }
  }

  console.log('\n--- 🎉 นำเข้าข้อมูล BOM เสร็จสิ้น! ---');
  console.log(`✅ สินค้าหลักที่อัปเดตสูตรสำเร็จ: ${importedParentCount} รายการ`);
  console.log(`✅ จำนวนแถวส่วนประกอบทั้งหมดที่ลงฐานข้อมูล: ${totalRowsInserted} แถว`);
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาดในสคริปต์:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
