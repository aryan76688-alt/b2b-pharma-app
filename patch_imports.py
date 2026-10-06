with open("src/app/salesman/orders/create/page.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import { AlertTriangle, AlertCircle, useRouter } from 'next/navigation';",
    "import { useRouter } from 'next/navigation';"
)

content = content.replace(
    "  CheckCircle2,\n  AlertCircle,\n  Plus,",
    "  CheckCircle2,\n  AlertCircle,\n  AlertTriangle,\n  Plus,"
)

with open("src/app/salesman/orders/create/page.tsx", "w") as f:
    f.write(content)
