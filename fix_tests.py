with open('scripts/test-e2e.mjs', 'r') as f:
    content = f.read()

content = content.replace("role, '\\n');", "role, '\\n');") # wait, let's just replace the raw newline
content = content.replace("role, '\n", "role, '\\n")

with open('scripts/test-e2e.mjs', 'w') as f:
    f.write(content)
