with open("src/lib/excel.ts", "r") as f:
    content = f.read()

replacement = """
  worksheet.columns = headers.map(h => {
    let w = 15;
    if (h === 'Product Name' || h === 'Party Name' || h === 'Company') w = 35;
    if (h === 'Address' || h === 'Email') w = 40;
    if (h === 'Batch' || h === 'Code') w = 20;
    if (h === 'Unit' || h === 'EXP') w = 12;
    return { header: h, key: h, width: w };
  });
"""

content = content.replace("worksheet.columns = headers.map(h => ({ header: h, key: h, width: 20 }));", replacement.strip())

with open("src/lib/excel.ts", "w") as f:
    f.write(content)
