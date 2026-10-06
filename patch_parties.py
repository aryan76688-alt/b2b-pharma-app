with open("src/app/owner/parties/page.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'href="/owner/import"',
    'href="/owner/import/parties"'
)
content = content.replace(
    'Import Excel',
    'Import Party'
)

with open("src/app/owner/parties/page.tsx", "w") as f:
    f.write(content)
