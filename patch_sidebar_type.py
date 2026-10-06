with open("src/components/layout/Sidebar.tsx", "r") as f:
    content = f.read()

import re

type_def = """  const { user, logout } = useAuth();

  if (!user) return null;

  const isOwner = user.role === 'owner';

  type NavItem = { label: string; href: string; icon: any; highlight?: boolean };

  const ownerNavItems: NavItem[] = ["""

content = content.replace(
    "  const isOwner = user.role === 'owner';\n\n  const ownerNavItems = [",
    type_def
)

content = content.replace(
    "  const salesmanNavItems = [",
    "  const salesmanNavItems: NavItem[] = ["
)

with open("src/components/layout/Sidebar.tsx", "w") as f:
    f.write(content)
