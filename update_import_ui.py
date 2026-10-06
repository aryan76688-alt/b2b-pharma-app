import re

def update_file(filepath, download_type):
    with open(filepath, "r") as f:
        content = f.read()
    
    # Add Download to Lucide React imports if not present
    if "Download" not in content and "lucide-react" in content:
        content = re.sub(r'(import \{.*?)(Upload)(.*?\} from \'lucide-react\';)', r'\1\2, Download\3', content)

    # Replace the Button block
    pattern = r'(<Button className="relative[^>]*>\s*<input[^>]*>\s*<Upload[^>]*>\s*[^<]*\s*</Button>)'
    
    replacement = f"""<div className="flex flex-col sm:flex-row items-center gap-3">
              \\1
              <a href="/api/import/sample/{download_type}" download>
                <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
                  <Download className="w-4 h-4 mr-2" />
                  Sample Format
                </Button>
              </a>
            </div>"""
    
    content = re.sub(pattern, replacement, content)
    
    with open(filepath, "w") as f:
        f.write(content)

update_file("src/app/owner/import/parties/page.tsx", "parties")
update_file("src/app/owner/import/stock/page.tsx", "stock")
# Does outstanding import exist? Let's check first.
