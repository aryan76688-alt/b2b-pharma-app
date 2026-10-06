import re
import os

# 1. owner/salesmen/page.tsx
path = "src/app/owner/salesmen/page.tsx"
with open(path, "r") as f: content = f.read()
content = re.sub(r'\{sm\.mpinCreated \? \'MPIN Active\' : \'MPIN Pending\'\}', '', content)
content = re.sub(r'Salesman will use this password for first login, then set up their 4-digit MPIN.', 'Salesman will use this password to login.', content)
with open(path, "w") as f: f.write(content)

# 2. owner/settings/page.tsx
path = "src/app/owner/settings/page.tsx"
with open(path, "r") as f: content = f.read()
# Let's just find the card for MPIN enforcement and remove it. Since we grep'd "Salesman 4-Digit MPIN Enforcement", let's replace the whole card block if we can, or just the label.
# A simpler way is to just let the text be something else or regex it out.
content = re.sub(r'<div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">.*?Salesman 4-Digit MPIN Enforcement.*?</div>\s*</div>', '</div>', content, flags=re.DOTALL)
with open(path, "w") as f: f.write(content)

# 3. forgot-password/page.tsx
path = "src/app/forgot-password/page.tsx"
with open(path, "r") as f: content = f.read()
content = content.replace('Forgot Password or MPIN', 'Forgot Password')
content = content.replace('reset your password or MPIN', 'reset your password')
with open(path, "w") as f: f.write(content)

# 4. login/page.tsx
path = "src/app/login/page.tsx"
with open(path, "r") as f: content = f.read()
content = re.sub(r'// MPIN mode state\n', '', content)
content = re.sub(r'const \[mpinIdentifier, setMpinIdentifier\] = useState\("ramesh"\);\n', '', content)
content = re.sub(r'const \[mpin, setMpin\] = useState\(""\);\n', '', content)
with open(path, "w") as f: f.write(content)

# 5. api/owner/salesmen/route.ts
path = "src/app/api/owner/salesmen/route.ts"
with open(path, "r") as f: content = f.read()
content = content.replace('They can now login and set up their 4-digit MPIN.', 'They can now login.')
with open(path, "w") as f: f.write(content)

# 6. api/auth/forgot-password/route.ts
path = "src/app/api/auth/forgot-password/route.ts"
with open(path, "r") as f: content = f.read()
content = content.replace('password / MPIN reset', 'password reset')
with open(path, "w") as f: f.write(content)

# 7. api/auth/login/route.ts
path = "src/app/api/auth/login/route.ts"
with open(path, "r") as f: content = f.read()
content = content.replace('requiresMpinSetup: false,', '')
with open(path, "w") as f: f.write(content)

# 8. salesman/profile/page.tsx
path = "src/app/salesman/profile/page.tsx"
with open(path, "r") as f: content = f.read()
# Let's remove the security card
pattern = r'\{\/\* Security & Quick MPIN Change \*\/\}.*?</Card>'
content = re.sub(pattern, '', content, flags=re.DOTALL)
with open(path, "w") as f: f.write(content)

