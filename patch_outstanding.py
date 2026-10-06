with open("src/app/owner/outstanding/page.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'href="/owner/import"',
    'href="/owner/import/outstanding"'
)
content = content.replace(
    'Import Outstanding Excel',
    'Import Outstanding'
)

with open("src/app/owner/outstanding/page.tsx", "w") as f:
    f.write(content)
