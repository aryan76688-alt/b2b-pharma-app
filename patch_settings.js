const fs = require('fs');
const file = 'src/app/owner/settings/page.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('Sync Database Schema')) {
  const syncBtn = `
          {/* Phase 2 DB Sync */}
          <div className="bg-white rounded-2xl border border-blue-100 p-5 sm:p-6 shadow-sm mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Feature Synchronization
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Click this button to update your live database to support Phase 2 Features (GPS Tracking, Offline Modes, Payments, and Schemes).
            </p>
            <Button
              onClick={async () => {
                const toastId = toast.loading('Syncing database...');
                try {
                  const res = await fetch('/api/owner/sync-db', { method: 'POST' });
                  const json = await res.json();
                  if (json.success) toast.success(json.message, { id: toastId });
                  else toast.error('Sync failed', { id: toastId });
                } catch(e) {
                  toast.error('Network error', { id: toastId });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Sync Database Schema
            </Button>
          </div>
`;
  code = code.replace("import { Card } from '@/components/ui/card';", "import { Card } from '@/components/ui/card';\nimport { Database } from 'lucide-react';\nimport toast from 'react-hot-toast';");
  code = code.replace("<div className=\"max-w-3xl mx-auto pb-24\">", "<div className=\"max-w-3xl mx-auto pb-24\">\n" + syncBtn);
  fs.writeFileSync(file, code);
}
