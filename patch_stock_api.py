with open("src/app/api/stock/route.ts", "r") as f: content = f.read()
content = content.replace("} else if (status === 'low_stock') {", "} else if (status === 'in_stock') {\n      conditions.push(`p.stock_qty > 0`);\n    } else if (status === 'low_stock') {")
with open("src/app/api/stock/route.ts", "w") as f: f.write(content)
