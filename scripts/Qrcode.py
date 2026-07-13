import qrcode
import os
print("วาง Item Code ได้หลายรายการ")
print("เมื่อวางเสร็จ ให้กด Enter อีก 1 ครั้ง เพื่อเริ่มสร้าง QR Code")

item_codes = []
output_folder = "QR_Code_Output"

os.makedirs(output_folder, exist_ok=True)
while True:
    item = input()

    if item == "":
        break

    item_codes.append(item)
# สร้าง QR Code ทุก Item Code
for item_code in item_codes:

    img = qrcode.make(item_code)

    img.save(os.path.join(output_folder, f"{item_code}.png"))

print(f"สร้าง QR Code สำเร็จ: QR_Code_Output/{item_code}.png")