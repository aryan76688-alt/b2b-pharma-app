const fs = require('fs');

const file = 'src/app/salesman/dashboard/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const newLink = `          <Link
            href="/salesman/collections"
            className="p-4 bg-white border border-slate-200 rounded-2xl shadow-soft hover:shadow-card transition-all flex flex-col items-center text-center group"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
              <Banknote className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Record Payment</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Log cash / cheque</p>
          </Link>
        </div>`;

if (!code.includes('Banknote')) {
  code = code.replace("import { AlertCircle,", "import { AlertCircle,\n  Banknote,");
  code = code.replace('grid-cols-3', 'grid-cols-2 md:grid-cols-4');
  code = code.replace("        </div>\n\n        {/* My Recent Orders */}", newLink + "\n\n        {/* My Recent Orders */}");
  fs.writeFileSync(file, code);
}
