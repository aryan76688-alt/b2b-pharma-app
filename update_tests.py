import re

with open('scripts/test-e2e.mjs', 'r') as f:
    content = f.read()

# Replace MPIN login block
mpin_test = """  // Test 4: Salesman Password Login (ramesh / Password123!)
  console.log('Test 4: Salesman Password Login (ramesh / Password123!)...');
  const salesmanLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'ramesh', password: 'Password123!' }),
  });
  assert.strictEqual(salesmanLogin.status, 200, 'Salesman login should return 200');
  assert.strictEqual(salesmanLogin.data.success, true);
  assert.strictEqual(salesmanLogin.data.data.user.role, 'salesman');
  const salesmanCookie = extractCookie(salesmanLogin.headers);
  assert.ok(salesmanCookie, 'Salesman should receive session cookie');
  console.log('✅ Salesman ramesh logged in successfully. Role:', salesmanLogin.data.data.user.role, '\\n');"""

content = re.sub(
    r"  // Test 4: MPIN Login for Salesman \(ramesh / 1234\).*?Role:', mpinLogin\.data\.data\.user\.role, '\\n'\);\n",
    mpin_test + "\n",
    content,
    flags=re.DOTALL
)

# Update references to salesmanCookie for Ramesh
content = re.sub(r"mpinLogin\.data\.data", "salesmanLogin.data.data", content)

with open('scripts/test-e2e.mjs', 'w') as f:
    f.write(content)
