import re

with open("src/components/providers.tsx", "r") as f:
    content = f.read()

# Remove pathname === '/mpin' ||
content = content.replace("pathname === '/mpin' ||\n", "")

# Remove the MPIN enforcement block
mpin_enforcement_pattern = r'\s*// First-login salesman MPIN enforcement\n\s*if \(user\.role === \'salesman\' && !user\.mpinCreated && pathname !== \'/mpin\'\) \{\n\s*router\.push\(\'/mpin\?mode=create\'\);\n\s*return;\n\s*\}\n'
content = re.sub(mpin_enforcement_pattern, '', content)

# Remove the other mpin enforcement block inside refresh user details
refresh_mpin_pattern = r'\s*if \(!userData\.mpinCreated\) \{\n\s*router\.push\(\'/mpin\?mode=create\'\);\n\s*return;\n\s*\}\n'
content = re.sub(refresh_mpin_pattern, '', content)

with open("src/components/providers.tsx", "w") as f:
    f.write(content)
