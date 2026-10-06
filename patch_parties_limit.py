with open("src/app/api/parties/route.ts", "r") as f: content = f.read()

# Add LIMIT 200 to the query
content = content.replace("ORDER BY p.party_name ASC\n    `;", "ORDER BY p.party_name ASC\n      LIMIT 200\n    `;")
with open("src/app/api/parties/route.ts", "w") as f: f.write(content)
