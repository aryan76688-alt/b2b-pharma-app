import re

with open('src/app/login/page.tsx', 'r') as f:
    content = f.read()

# 1. Remove MPINKeyboard import
content = re.sub(r"import \{ MPINKeyboard \} from '@/components/auth/MPINKeyboard';\n", "", content)

# 2. Remove mode state and related
content = re.sub(r"  const \[mode, setMode\] = useState<'password' \| 'mpin'>\('mpin'\);\n\s+// Password mode state\n", "", content)

# 3. Remove MPIN mode state
content = re.sub(r"  // MPIN mode state\n  const \[mpinIdentifier, setMpinIdentifier\] = useState\('ramesh'\);\n  const \[mpin, setMpin\] = useState\(''\);\n\n", "", content)

# 4. Remove setMpinIdentifier from useEffect
content = re.sub(r"      setMpinIdentifier\(saved\);\n", "", content)

# 5. Remove requiresMpinSetup block
content = re.sub(r"      if \(json\.data\.requiresMpinSetup\) \{\n        sessionStorage\.setItem\('temp_user', JSON\.stringify\(json\.data\.user\)\);\n        router\.push\('/mpin\?mode=create'\);\n        return;\n      \}\n", "", content)

# 6. Remove handleMpinLogin
content = re.sub(r"  const handleMpinLogin = async \(overridePin\?: string\) => \{.*?\};\n\n", "", content, flags=re.DOTALL)

# 7. Update handleQuickFill
quick_fill_new = """  const handleQuickFill = (accountType: 'owner' | 'ramesh' | 'suresh') => {
    setError(null);
    if (accountType === 'owner') {
      setIdentifier('owner');
      setPassword('Password123!');
    } else if (accountType === 'ramesh') {
      setIdentifier('ramesh');
      setPassword('Password123!');
    } else if (accountType === 'suresh') {
      setIdentifier('suresh');
      setPassword('Password123!');
    }
  };"""
content = re.sub(r"  // Quick-fill demo account helper\n  const handleQuickFill = \(accountType: 'owner' \| 'ramesh' \| 'suresh'\) => \{.*?\};\n", "  // Quick-fill demo account helper\n" + quick_fill_new + "\n", content, flags=re.DOTALL)

# 8. Remove Dual Login Mode Tabs
content = re.sub(r"            \{\/\* Dual Login Mode Tabs \*\/\}.*?<\/div>\n", "", content, flags=re.DOTALL)

# 9. Remove MODE 1: Fast Salesman MPIN Login
content = re.sub(r"            \{\/\* MODE 1: Fast Salesman MPIN Login \*\/\}\n            \{mode === 'mpin' && \(.*?\)\}\n\n", "", content, flags=re.DOTALL)

# 10. Remove MODE 2: Owner / Staff Password Login header and wrapper
content = re.sub(r"            \{\/\* MODE 2: Owner \/ Staff Password Login \*\/\}\n            \{mode === 'password' && \(\n", "            {/* Login Form */}\n", content)
content = re.sub(r"              <\/form>\n            \)\}\n", "              </form>\n", content)

# 11. Fix Quick Demo Credentials Bar
content = re.sub(r"setMode\('mpin'\);\n\s+setMpinIdentifier\('ramesh'\);\n\s+setMpin\('1234'\);\n\s+setTimeout\(\(\) => handleMpinLogin\('1234'\), 150\);", "setIdentifier('ramesh');\n      setPassword('Password123!');", content, flags=re.DOTALL)

content = content.replace("PIN 1234", "Auto Fill")
content = content.replace("Setup PIN", "Auto Fill")
content = content.replace("MR Quick MPIN", "")

with open('src/app/login/page.tsx', 'w') as f:
    f.write(content)
