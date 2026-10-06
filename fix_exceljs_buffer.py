with open("src/lib/excel.ts", "r") as f:
    content = f.read()

content = content.replace(
    "return (await workbook.xlsx.writeBuffer()) as Buffer;",
    "return Buffer.from(await workbook.xlsx.writeBuffer() as ArrayBuffer);"
)

with open("src/lib/excel.ts", "w") as f:
    f.write(content)
