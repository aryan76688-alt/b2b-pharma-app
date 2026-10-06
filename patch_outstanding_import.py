with open("src/app/owner/import/outstanding/page.tsx", "r") as f:
    content = f.read()

content = content.replace('Import Stock', 'Import Outstanding')
content = content.replace('stock', 'outstanding')
content = content.replace('Stock', 'Outstanding')
content = content.replace('/api/import/outstanding', '/api/import/outstanding') # just checking
content = content.replace('Upload the current stock and batches', 'Upload outstanding aging report')
content = content.replace('Stock_Import_Template', 'Outstanding_Template')
content = content.replace('Products added/updated', 'Parties updated')
content = content.replace('batches processed', 'outstanding records processed')
content = content.replace('Batches updated', 'Records updated')
content = content.replace('Total items processed:', 'Total records processed:')

with open("src/app/owner/import/outstanding/page.tsx", "w") as f:
    f.write(content)
