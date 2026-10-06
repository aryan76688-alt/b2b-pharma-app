import re

with open("src/app/owner/dashboard/page.tsx", "r") as f:
    content = f.read()

# Replace topProducts declaration
content = content.replace("const topProducts = data?.topProducts || [];", "const nearExpiryProducts = data?.nearExpiryProducts || [];")

with open("src/app/owner/dashboard/page.tsx", "w") as f:
    f.write(content)
