import re

with open("src/components/providers.tsx", "r") as f:
    content = f.read()

# Replace the login function body to route directly
new_login = """  const login = (token: string, userData: User) => {
    setUser(userData);
    if (userData.role === 'owner') {
      router.push('/owner/dashboard');
    } else {
      router.push('/salesman/dashboard');
    }
  };"""

content = re.sub(r'  const login = \(token: string, userData: User\) => \{.*?\};\n', new_login + "\n", content, flags=re.DOTALL)

with open("src/components/providers.tsx", "w") as f:
    f.write(content)
