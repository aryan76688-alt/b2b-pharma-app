with open("src/app/api/owner/dashboard/route.ts", "r") as f: content = f.read()

# Remove the >= CURRENT_DATE condition
content = content.replace("AND b.expiry_date >= CURRENT_DATE \\", "AND b.expiry_date >= CURRENT_DATE - INTERVAL '10 years' \\")
content = content.replace("AND expiry_date >= CURRENT_DATE \\", "AND expiry_date >= CURRENT_DATE - INTERVAL '10 years' \\")
with open("src/app/api/owner/dashboard/route.ts", "w") as f: f.write(content)
