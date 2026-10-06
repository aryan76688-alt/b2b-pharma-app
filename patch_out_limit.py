with open("src/app/api/outstanding/route.ts", "r") as f: content = f.read()

# Add LIMIT 200
content = content.replace("sql += ` ORDER BY \"totalOutstanding\" DESC`;", "sql += ` ORDER BY \"totalOutstanding\" DESC LIMIT 200`;")
with open("src/app/api/outstanding/route.ts", "w") as f: f.write(content)
