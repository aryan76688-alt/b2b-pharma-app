with open("src/app/api/import/outstanding/route.ts", "r") as f:
    content = f.read()

# Replace parsing logic
old_parse = "const totalOutstanding = parseFloat(String(getVal('totalOutstanding'))) || 0;"
new_parse = "const totalOutstanding = parseFloat(String(getVal('totalOutstanding')).replace(/[^0-9.-]+/g, '')) || 0;"

content = content.replace(old_parse, new_parse)

# Days parsing
old_days = "const pendingDays = parseInt(String(getVal('pendingDays')), 10) || 0;"
new_days = "const pendingDays = parseInt(String(getVal('pendingDays')).replace(/[^0-9]+/g, ''), 10) || 0;"

content = content.replace(old_days, new_days)

with open("src/app/api/import/outstanding/route.ts", "w") as f:
    f.write(content)
