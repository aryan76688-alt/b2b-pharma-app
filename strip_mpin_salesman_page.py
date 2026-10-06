import re

with open("src/app/owner/salesmen/[id]/page.tsx", "r") as f:
    content = f.read()

# Remove state
content = re.sub(r'const \[isResetMpinOpen, setIsResetMpinOpen\] = useState\(false\);\n', '', content)

# Remove handler
handler_pattern = r'const handleResetMpin = async \(\) => \{.*?\};\n\n'
content = re.sub(handler_pattern, '', content, flags=re.DOTALL)

# Remove button from UI
button_pattern = r'<Button[^>]*onClick=\{.*?setIsResetMpinOpen\(true\).*?\}.*?</Button>'
content = re.sub(button_pattern, '', content, flags=re.DOTALL)

# Remove the entire MPIN Dialog
dialog_pattern = r'\{\/\* Reset MPIN Confirmation Dialog \*\/\}.*?Reset MPIN Now\n.*?</Dialog>'
content = re.sub(dialog_pattern, '', content, flags=re.DOTALL)

with open("src/app/owner/salesmen/[id]/page.tsx", "w") as f:
    f.write(content)
