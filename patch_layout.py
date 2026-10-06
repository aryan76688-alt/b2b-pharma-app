with open("src/app/layout.tsx", "r") as f:
    content = f.read()

if "react-hot-toast" not in content:
    content = content.replace(
        "import './globals.css';",
        "import './globals.css';\nimport { Toaster } from 'react-hot-toast';"
    )
    content = content.replace(
        "</body>",
        "  <Toaster position=\"top-center\" />\n      </body>"
    )

with open("src/app/layout.tsx", "w") as f:
    f.write(content)
