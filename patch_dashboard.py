with open("src/app/owner/dashboard/page.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if "Excel Import" in line and "{ label:" in line:
        continue # skip the quick action item
    
    if "actions={" in line:
        # We need to remove the whole actions block which is 9 lines long.
        # But wait, maybe I can just do a multi-line replace.
        pass
        
with open("src/app/owner/dashboard/page.tsx", "r") as f:
    content = f.read()

import re
# Remove the actions={...} prop from AppShell
content = re.sub(
    r'actions=\{\s*<div className="flex items-center gap-2">\s*<Link href="/owner/import">\s*<Button.*?>\s*<FileSpreadsheet.*?>.*?</Button>\s*</Link>\s*</div>\s*\}',
    '',
    content,
    flags=re.DOTALL
)

# Remove the quick action
content = re.sub(
    r'\{\s*label:\s*\'Excel Import\'[^\}]+\},',
    '',
    content,
    flags=re.DOTALL
)

with open("src/app/owner/dashboard/page.tsx", "w") as f:
    f.write(content)
