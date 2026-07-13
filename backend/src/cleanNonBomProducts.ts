import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- 🚀 เริ่มตรวจสอบและลบสินค้าที่ไม่ได้อยู่ในตาราง BillOfMaterial ---');

  // 1. ดึงรายการรหัสสินค้าทั้งหมดที่มีอยู่ในตาราง BillOfMaterial (ทั้ง Parent และ Component)
  const boms = await prisma.billOfMaterial.findMany();
  const bomCodes = new Set<string>();

  for (const bom of boms) {
    if (bom.parentItemCode) bomCodes.add(bom.parentItemCode.trim());
    if (bom.componentItemCode) bomCodes.add(bom.componentItemCode.trim());
  }

  console.log(`📌 จำนวน Item Code ที่อยู่ในตาราง BillOfMaterial ทั้งหมด: ${bomCodes.size} รหัส`);

  // 2. ดึงรายการสินค้าในตาราง Product ทั้งหมด
  const allProducts = await prisma.product.findMany();
  console.log(`📌 จำนวนสินค้าทั้งหมดในตาราง Product ก่อนลบ: ${allProducts.length} รายการ`);

  // 3. คัดกรองสินค้าที่ไม่อยู่ใน BillOfMaterial
  const nonBomCodes: string[] = [];
  const nonBomIds: number[] = [];
  for (const prod of allProducts) {
    if (!bomCodes.has(prod.itemCode.trim())) {
      nonBomCodes.push(prod.itemCode);
      nonBomIds.push(prod.id);
    }
  }

  console.log(`🗑️ พบสินค้าที่ไม่ได้อยู่ใน BillOfMaterial จำนวน ${nonBomCodes.length} รายการที่จะถูกลบออก`);
  if (nonBomCodes.length > 0) {
    console.log(`ตัวอย่างรหัสที่จะถูกลบ: ${nonBomCodes.slice(0, 15).join(', ')} ...`);

    // 4. ลบประวัติทำรายการ (Transaction) ของสินค้าที่ไม่อยู่ใน BOM ออกก่อน (เพื่อไม่ให้ติด Foreign Key)
    const deletedTransactions = await prisma.transaction.deleteMany({
      where: { productId: { in: nonBomIds } }
    });
    console.log(`🧹 ลบประวัติทำรายการที่เกี่ยวข้องไป ${deletedTransactions.count} รายการ`);

    // 5. ลบสินค้าออกจากตาราง Product
    const deletedProducts = await prisma.product.deleteMany({
      where: { id: { in: nonBomIds } }
    });
    console.log(`✅ ลบสินค้าที่ไม่ได้อยู่ในตาราง BillOfMaterial ออกจากตาราง Product สำเร็จจำนวน: ${deletedProducts.count} รายการ`);
  } else {
    console.log(`✨ ไม่มีสินค้าอื่นแปลกปลอมในตาราง Product ทุกรายการอยู่ใน BillOfMaterial อยู่แล้วครับ`);
  }

  const remainingProducts = await prisma.product.count();
  console.log(`\n🎉 คงเหลือสินค้าในตาราง Product จำนวนทั้งสิ้น: ${remainingProducts} รายการ (ตรงกับฐานข้อมูล BillOfMaterial 100%)`);
}

main()
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
