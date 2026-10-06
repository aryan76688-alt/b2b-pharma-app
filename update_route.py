with open("src/app/api/import/sample/[type]/route.ts", "r") as f:
    content = f.read()

content = content.replace(
    "import { createExcelBuffer } from '@/lib/excel';",
    "import { createExcelBuffer, createStyledExcelBuffer } from '@/lib/excel';"
)

content = content.replace(
    "const buffer = createExcelBuffer(sheetName, data);",
    "const buffer = await createStyledExcelBuffer(sheetName, data);"
)

with open("src/app/api/import/sample/[type]/route.ts", "w") as f:
    f.write(content)
