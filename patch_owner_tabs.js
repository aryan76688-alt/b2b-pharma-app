const fs = require('fs');
const file = 'src/app/owner/stock/page.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(
  "    { id: 'out_of_stock', label: 'Out of Stock (0)' },",
  "    { id: 'out_of_stock', label: 'Out of Stock (0)' },\n    { id: 'near_expiry', label: 'Near Expiry' },\n    { id: 'expired', label: 'Expired' },"
);
fs.writeFileSync(file, code);
