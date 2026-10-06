with open("src/lib/excel.ts", "r") as f:
    content = f.read()

# I will modify createStyledExcelBuffer to accept a color or determine color based on sheetName
import re

replacement = """
  // Style headers
  const headerRow = worksheet.getRow(1);
  const isDark = sheetName.includes('Parties') || sheetName.includes('Outstanding');
  
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isDark ? 'FF1F4E79' : 'FFD1DDF1' }
    };
    cell.font = { 
      bold: true,
      color: { argb: isDark ? 'FFFFFFFF' : 'FF000000' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
"""

# We need to replace the exact headerRow block
start_str = "  // Style headers\n  const headerRow = worksheet.getRow(1);"
end_str = "  // Add data rows"

idx1 = content.find(start_str)
idx2 = content.find(end_str)

if idx1 != -1 and idx2 != -1:
    content = content[:idx1] + replacement.strip() + "\n\n  " + content[idx2:]

with open("src/lib/excel.ts", "w") as f:
    f.write(content)
