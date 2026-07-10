import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- เริ่มการลบข้อมูลเดิมในตาราง Transaction, Product และ User ---');

  // 1. ลบข้อมูลจากตาราง Transaction ก่อน (เนื่องจากมี Foreign Key ชี้ไปหา Product และ User)
  const deletedTransactions = await prisma.transaction.deleteMany({});
  console.log(`✅ ลบข้อมูลในตาราง Transaction สำเร็จ: ${deletedTransactions.count} รายการ`);

  // 2. ลบข้อมูลจากตาราง Product
  const deletedProducts = await prisma.product.deleteMany({});
  console.log(`✅ ลบข้อมูลในตาราง Product สำเร็จ: ${deletedProducts.count} รายการ`);

  // 3. ลบข้อมูลจากตาราง User
  const deletedUsers = await prisma.user.deleteMany({});
  console.log(`✅ ลบข้อมูลในตาราง User สำเร็จ: ${deletedUsers.count} รายการ`);

  console.log('--- 🎉 ลบข้อมูลเดิมทั้ง 3 ตารางออกจาก Supabase เรียบร้อยแล้ว ---');
}

main()
  .catch((e) => {
    console.error('❌ เกิดข้อผิดพลาดในการลบข้อมูล:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
