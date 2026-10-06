with open("src/components/layout/Sidebar.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "  const { user, logout } = useAuth();\n\n  if (!user) return null;\n\n  const { user, logout } = useAuth();\n\n  if (!user) return null;\n",
    "  const { user, logout } = useAuth();\n\n  if (!user) return null;\n"
)

with open("src/components/layout/Sidebar.tsx", "w") as f:
    f.write(content)
