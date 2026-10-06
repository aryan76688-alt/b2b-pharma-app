import re

with open("src/app/salesman/products/page.tsx", "r") as f: content = f.read()

# Add status state
content = content.replace("const [search, setSearch] = useState('');", "const [search, setSearch] = useState('');\n  const [statusFilter, setStatusFilter] = useState('All');")
content = content.replace("if (search) params.set('search', search);", "if (search) params.set('search', search);\n      if (statusFilter === 'In Stock') params.set('status', 'in_stock');\n      if (statusFilter === 'Out of Stock') params.set('status', 'out_of_stock');")

# Add fetch dependency on statusFilter
content = content.replace("}, [category]);", "}, [category, statusFilter]);")

# Add filter dropdown in UI next to Category tabs or Search
ui_patch = """
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 max-w-5xl justify-between">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={(val) => {
                setSearch(val);
                fetchProducts();
              }}
              placeholder="Search medicine name, company, or pack..."
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Stock</option>
              <option value="In Stock">In Stock Only</option>
              <option value="Out of Stock">Out of Stock Only</option>
            </select>
          </div>
        </div>
"""

content = re.sub(r'        \{\/\* Search \*\/\}.*?</SearchBar>\s*</div>', ui_patch.strip(), content, flags=re.DOTALL)

# Add batches display
batch_ui = """
                  <div className="flex flex-col gap-1 mt-2 mb-2">
                    {p.batches && p.batches.length > 0 ? p.batches.map((b: any) => (
                      <div key={b.id} className="flex justify-between items-center text-[10px] bg-slate-100/50 p-1.5 rounded border border-slate-100">
                        <span className="font-mono text-slate-700">Batch: {b.batchNo}</span>
                        <span className="text-slate-600">Stock: <strong className={b.stockQty > 0 ? "text-emerald-600" : "text-red-500"}>{b.stockQty}</strong></span>
                        <span className={b.isExpired ? "text-red-600 font-bold" : b.isNearExpiry ? "text-amber-600 font-bold" : "text-slate-500"}>Exp: {new Date(b.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric'})}</span>
                      </div>
                    )) : (
                      <div className="text-[10px] text-slate-400 italic">No batches tracked</div>
                    )}
                  </div>
"""

content = content.replace("                  <div className=\"flex items-center justify-between pt-2 border-t border-slate-100\">", batch_ui.strip() + "\n                  <div className=\"flex items-center justify-between pt-2 border-t border-slate-100\">")

with open("src/app/salesman/products/page.tsx", "w") as f: f.write(content)
