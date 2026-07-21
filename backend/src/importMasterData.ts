import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 🚀 เริ่มต้นกระบวนการนำเข้าข้อมูล Master Data สู่ระบบ Supabase ===\n');

  // ---------------------------------------------------------
  // 1. สร้างผู้ใช้งานเริ่มต้น (Admin และ Warehouse Staff)
  // ---------------------------------------------------------
  console.log('--- Step 1: สร้างข้อมูลผู้ใช้งานเริ่มต้นในตาราง User ---');
  const supervisorPassword = await bcrypt.hash('super1234', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  const adminUser = await prisma.user.upsert({
    where: { username: 'supervisor' },
    update: {
      password: supervisorPassword,
      fullName: 'ผู้ควบคุมดูแลระบบ (Supervisor)',
      role: 'admin'
    },
    create: {
      username: 'supervisor',
      password: supervisorPassword,
      fullName: 'ผู้ควบคุมดูแลระบบ (Supervisor)',
      role: 'admin'
    }
  });

  const staffUser = await prisma.user.upsert({
    where: { username: 'staff' },
    update: {
      password: staffPassword,
      fullName: 'พนักงานทั่วไป (Staff)',
      role: 'warehouse_staff'
    },
    create: {
      username: 'staff',
      password: staffPassword,
      fullName: 'พนักงานทั่วไป (Staff)',
      role: 'warehouse_staff'
    }
  });

  console.log(`✅ สร้างผู้ใช้งานสำเร็จ: ${adminUser.username} (Role: ${adminUser.role}) และ ${staffUser.username} (Role: ${staffUser.role})\n`);

  // ---------------------------------------------------------
  // 2. อ่านไฟล์ Excel และรวบรวมรายการสินค้า (Products) และสูตร BOM
  // ---------------------------------------------------------
  console.log('--- Step 2: อ่านข้อมูลสินค้า (Product) และสูตรการผลิต (BOM) จากไฟล์ Excel ---');
  const filePath = path.resolve(__dirname, '../../Bill of Materials Report ( YAMALUBE ).xlsx');
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets['Sheet3'];

  if (!worksheet) {
    console.error('❌ ไม่พบชีตชื่อ "Sheet3" ในไฟล์ Excel');
    process.exit(1);
  }

  const rawRows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  console.log(`📊 พบแถวข้อมูลใน Sheet3 จำนวนทั้งสิ้น ${rawRows.length - 1} แถว`);

  // สร้าง Map สำหรับรวบรวมสินค้าทั้งหมดที่ไม่ซ้ำกัน
  const productMap = new Map<string, {
    itemCode: string;
    description: string;
    unit: string;
    warehouse: string;
    itemType: string;
    quantity: number;
  }>();

  // สร้าง Map สำหรับจัดกลุ่ม BOM ตาม parentItemCode
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

  // วนลูปอ่านข้อมูลตั้งแต่แถวที่ 2 เป็นต้นไป
  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const parentCode = row[0] ? String(row[0]).trim() : '';
    const componentCode = row[1] ? String(row[1]).trim() : '';
    
    if (!parentCode || !componentCode) continue;

    const description = row[2] ? String(row[2]).trim() : '-';
    const uom = row[3] ? String(row[3]).trim() : 'PCS';
    const quantity = row[4] !== undefined && row[4] !== null ? Number(row[4]) || 0 : 0;
    const warehouse = row[5] ? String(row[5]).trim() : '-';
    const depth = row[7] !== undefined && row[7] !== null ? Number(row[7]) || 1 : 1;
    const bomType = row[8] ? String(row[8]).trim() : 'N';

    // วิเคราะห์ประเภทสินค้า (itemType) ของ component
    let itemType = 'FG';
    if (depth === 1) {
      itemType = 'FG'; // สินค้าสำเร็จรูป
    } else if (depth === 2 && bomType === 'Production') {
      itemType = 'Bulk'; // น้ำมันเบลนด์/กึ่งสำเร็จรูป
    } else if (depth === 2) {
      itemType = 'Packaging'; // บรรจุภัณฑ์ (ถัง, กล่อง, แกลลอน, ฉลาก)
    } else if (depth === 3) {
      itemType = 'Raw Material'; // วัตถุดิบในการผสม (Base oil, Additives)
    }

    // เก็บข้อมูลลง productMap (ถ้าเจอครั้งแรก หรือถ้าเป็น Depth 1 ให้เขียนทับข้อมูลที่สมบูรณ์กว่า)
    if (!productMap.has(componentCode) || depth === 1) {
      productMap.set(componentCode, {
        itemCode: componentCode,
        description,
        unit: uom,
        warehouse,
        itemType,
        quantity: quantity || 0
      });
    }

    // เก็บข้อมูลลง bomsByParent
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

  console.log(`📦 รวบรวมรหัสสินค้าที่ไม่ซ้ำกันได้ทั้งสิ้น: ${productMap.size} รายการ (FG, Bulk, Packaging, Raw Material)`);
  console.log(`📋 รวบรวมรหัสสินค้าหลักที่มีสูตร BOM ทั้งสิ้น: ${bomsByParent.size} รายการ\n`);

  // ---------------------------------------------------------
  // 3. บันทึกข้อมูลรายการสินค้าทั้งหมดลงตาราง Product
  // ---------------------------------------------------------
  console.log('--- Step 3: นำเข้าสินค้าทั้งหมดลงตาราง Product ใน Supabase ---');
  let productUpsertCount = 0;
  for (const prod of productMap.values()) {
    try {
      await prisma.product.upsert({
        where: { itemCode: prod.itemCode },
        update: {
          description: prod.description,
          unit: prod.unit,
          warehouse: prod.warehouse,
          itemType: prod.itemType
        },
        create: {
          itemCode: prod.itemCode,
          description: prod.description,
          unit: prod.unit,
          warehouse: prod.warehouse,
          location: '-', // ค่าเริ่มต้น
          quantity: prod.quantity || 0,   // ค่าเริ่มต้นสต็อกสินค้า
          itemType: prod.itemType
        }
      });
      productUpsertCount++;
    } catch (err) {
      console.error(`❌ เกิดข้อผิดพลาดกับสินค้า ${prod.itemCode}:`, err);
    }
  }
  console.log(`✅ บันทึกข้อมูลลงตาราง Product สำเร็จ: ${productUpsertCount} รายการ\n`);

  // ---------------------------------------------------------
  // 4. บันทึกข้อมูลความสัมพันธ์สูตรการผลิตลงตาราง BillOfMaterial
  // ---------------------------------------------------------
  console.log('--- Step 4: นำเข้าสูตรการผลิตลงตาราง BillOfMaterial ใน Supabase ---');
  let importedParentCount = 0;
  let totalBomRowsInserted = 0;

  for (const [parentCode, components] of bomsByParent.entries()) {
    try {
      await prisma.billOfMaterial.deleteMany({
        where: { parentItemCode: parentCode }
      });

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
      totalBomRowsInserted += components.length;
    } catch (err) {
      console.error(`❌ เกิดข้อผิดพลาดกับ BOM ของ ${parentCode}:`, err);
    }
  }
  console.log(`✅ อัปเดตสูตร BOM สำเร็จ: ${importedParentCount} สินค้าหลัก รวม ${totalBomRowsInserted} แถวส่วนประกอบ\n`);

  console.log('=== 🎉 เสร็จสิ้นกระบวนการนำเข้าข้อมูลทั้งหมดลง Supabase เรียบร้อยแล้ว ===');
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาดในระบบ:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
