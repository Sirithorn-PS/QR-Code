import openpyxl
from prisma import Prisma
import asyncio

# Read Excel file
async def import_stock_data():
    prisma = Prisma()
    await prisma.connect()

    try:
        file_path = '../stock eneos 30.05.26.xlsx'
        wb = openpyxl.load_workbook(file_path)
        ws = wb['คงเหลือ']  # Use the specific sheet

        # Skip header row and process data
        for i, row in enumerate(ws.iter_rows(values_only=True), 1):
            if i == 1:  # Skip header
                continue
            
            no, item_code, description, unit, warehouse, location, total, _ = row
            
            if item_code is None:  # Skip empty rows
                continue
            
            print(f"Importing: {item_code} - {description[:50]}... ({total})")
            
            # Create or update product
            await prisma.product.upsert(
                where={"itemCode": str(item_code)},
                data={
                    "create": {
                        "itemCode": str(item_code),
                        "description": str(description),
                        "unit": str(unit) if unit else "PCS",
                        "warehouse": str(warehouse) if warehouse else "",
                        "location": str(location) if location else "",
                        "quantity": int(total) if total else 0,
                    },
                    "update": {
                        "description": str(description),
                        "quantity": int(total) if total else 0,
                        "location": str(location) if location else "",
                    }
                }
            )

        print(f"\n✅ Import completed! {i} rows processed")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    finally:
        await prisma.disconnect()

# Run import
if __name__ == "__main__":
    asyncio.run(import_stock_data())
