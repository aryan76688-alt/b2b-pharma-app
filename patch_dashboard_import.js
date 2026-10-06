const fs = require('fs');
const file = 'src/app/owner/dashboard/page.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('AIBrainWidget')) {
  // Add import
  code = code.replace("import { StatCard } from '@/components/shared/StatCard';", "import { StatCard } from '@/components/shared/StatCard';\nimport { AIBrainWidget } from '@/components/shared/AIBrainWidget';");
  
  // Add component
  code = code.replace("{/* Charts: Sales Trend & Top Products */}", "<AIBrainWidget />\n\n        {/* Charts: Sales Trend & Top Products */}");
  fs.writeFileSync(file, code);
}
