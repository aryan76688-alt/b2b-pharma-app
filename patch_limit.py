with open("src/app/api/stock/route.ts", "r") as f: content = f.read()

# Add LIMIT 100 to the query
content = content.replace("ORDER BY p.product_name ASC`,", "ORDER BY p.product_name ASC\n      LIMIT 100`,")
with open("src/app/api/stock/route.ts", "w") as f: f.write(content)
