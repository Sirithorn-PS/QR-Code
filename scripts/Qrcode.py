import os
import sys
import zipfile
import xml.etree.ElementTree as ET
import qrcode

# Set stdout encoding for Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def read_xlsx_strings(zip_ref):
    strings = []
    if "xl/sharedStrings.xml" in zip_ref.namelist():
        xml_content = zip_ref.read("xl/sharedStrings.xml")
        tree = ET.fromstring(xml_content)
        for elem in tree.iter():
            if elem.tag.endswith('t'):
                strings.append(elem.text or "")
    return strings

def parse_xlsx(file_path):
    codes = []
    with zipfile.ZipFile(file_path, 'r') as z:
        shared_strings = read_xlsx_strings(z)
        sheet_files = [f for f in z.namelist() if f.startswith("xl/worksheets/sheet")]
        for sheet_file in sheet_files:
            xml_content = z.read(sheet_file)
            tree = ET.fromstring(xml_content)
            
            for row in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                for cell in row.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    cell_type = cell.attrib.get('t')
                    val_elem = cell.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = val_elem.text if val_elem is not None else ""
                    
                    if cell_type == 's' and val.isdigit():
                        idx = int(val)
                        if idx < len(shared_strings):
                            val = shared_strings[idx]
                    
                    val_clean = val.strip()
                    if val_clean and "code" not in val_clean.lower():
                        codes.append(val_clean)
    return codes

script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)

excel_file = None
for search_dir in [project_dir, script_dir, os.getcwd()]:
    if os.path.exists(search_dir):
        # 1. Target CODE NO^.xlsx specifically
        for fname in os.listdir(search_dir):
            if fname.startswith('CODE NO') and fname.lower().endswith('.xlsx'):
                excel_file = os.path.join(search_dir, fname)
                break
        # 2. Fallback to any .xlsx
        if not excel_file:
            for fname in os.listdir(search_dir):
                if fname.lower().endswith('.xlsx') and not fname.startswith('~$'):
                    excel_file = os.path.join(search_dir, fname)
                    break
    if excel_file:
        break

output_folder = os.path.join(project_dir, "QR_Code_Output")
os.makedirs(output_folder, exist_ok=True)

if excel_file:
    print(f"กำลังอ่านข้อมูล Item Code จากไฟล์: {excel_file}...")
    item_codes = parse_xlsx(excel_file)
else:
    print("วาง Item Code ได้หลายรายการ (กด Enter เมื่อเสร็จสิ้น):")
    item_codes = []
    while True:
        item = input().strip()
        if not item:
            break
        item_codes.append(item)

print(f"พบรายการ Item Code ทั้งหมด: {len(item_codes)} รายการ")

generated_count = 0
for code in item_codes:
    qr_value = code
    safe_filename = "".join(c if c not in r'\/:*?"<>|' else '_' for c in code) + ".png"
    filepath = os.path.join(output_folder, safe_filename)
    
    img = qrcode.make(qr_value)
    img.save(filepath)
    generated_count += 1

print(f"สร้าง QR Code สำเร็จจำนวน {generated_count} รูปภาพที่โฟลเดอร์: {os.path.abspath(output_folder)}")
