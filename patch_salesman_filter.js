const fs = require('fs');
const file = 'src/app/salesman/products/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const oldLogic = `if (statusFilter === 'In Stock') params.set('status', 'in_stock');
      if (statusFilter === 'Out of Stock') params.set('status', 'out_of_stock');`;
const newLogic = `if (statusFilter === 'In Stock') params.set('status', 'in_stock');
      if (statusFilter === 'Out of Stock') params.set('status', 'out_of_stock');
      if (statusFilter === 'Near Expiry') params.set('status', 'near_expiry');
      if (statusFilter === 'Expired') params.set('status', 'expired');`;
code = code.replace(oldLogic, newLogic);

const oldSelect = `<select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none"
            >
              <option value="All">All Stock</option>
              <option value="In Stock">In Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>`;
const newSelect = `<select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none"
            >
              <option value="All">All Stock</option>
              <option value="In Stock">In Stock</option>
              <option value="Near Expiry">Near Expiry</option>
              <option value="Expired">Expired</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>`;
code = code.replace(oldSelect, newSelect);
fs.writeFileSync(file, code);
