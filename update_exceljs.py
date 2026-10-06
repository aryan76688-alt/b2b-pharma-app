with open("src/lib/excel.ts", "r") as f:
    content = f.read()

new_code = """
import ExcelJS from 'exceljs';

export async function createStyledExcelBuffer(sheetName: string, data: any[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  if (data.length === 0) {
    return (await workbook.xlsx.writeBuffer()) as Buffer;
  }
  
  const headers = Object.keys(data[0]);
  worksheet.columns = headers.map(h => ({ header: h, key: h, width: 20 }));
  
  // Style headers
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E1F2' } // Light purple/blue like MARG
    };
    cell.font = { bold: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Add data rows
  data.forEach((row, index) => {
    const rowNode = worksheet.addRow(row);
    rowNode.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  return (await workbook.xlsx.writeBuffer()) as Buffer;
}
"""

content = content + new_code

with open("src/lib/excel.ts", "w") as f:
    f.write(content)
