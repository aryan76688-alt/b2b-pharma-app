with open("src/app/owner/import/stock/page.tsx", "r") as f:
    content = f.read()

pattern = """                <p className="text-sm text-slate-500 max-w-md">
                  Upload your STOCK REPORT.xlsx. Products with multiple batches are automatically separated.
                </p>
              </label>"""

replacement = """                <p className="text-sm text-slate-500 max-w-md">
                  Upload your STOCK REPORT.xlsx. Products with multiple batches are automatically separated.
                </p>
              </label>
              <div className="mt-6 flex justify-center">
                <a href="/api/import/sample/stock" download onClick={(e) => e.stopPropagation()}>
                  <button className="flex items-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:text-shreeji-blue font-medium text-sm transition-colors shadow-sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download Sample Format
                  </button>
                </a>
              </div>"""

content = content.replace(pattern, replacement)

with open("src/app/owner/import/stock/page.tsx", "w") as f:
    f.write(content)
