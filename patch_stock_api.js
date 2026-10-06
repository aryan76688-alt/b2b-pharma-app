const fs = require('fs');
const file = 'src/app/api/stock/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Add near_expiry and expired logic
const newLogic = `
    if (status === 'out_of_stock') {
      conditions.push(\`p.stock_qty <= 0\`);
    } else if (status === 'in_stock') {
      conditions.push(\`p.stock_qty > 0\`);
    } else if (status === 'low_stock') {
      conditions.push(\`p.stock_qty > 0 AND p.stock_qty <= p.minimum_stock\`);
    } else if (status === 'near_expiry') {
      conditions.push(\`EXISTS (SELECT 1 FROM product_batches pb WHERE pb.product_id = p.id AND pb.expiry_date >= CURRENT_DATE AND pb.expiry_date <= CURRENT_DATE + INTERVAL '120 days' AND pb.stock_qty > 0)\`);
    } else if (status === 'expired') {
      conditions.push(\`EXISTS (SELECT 1 FROM product_batches pb WHERE pb.product_id = p.id AND pb.expiry_date < CURRENT_DATE AND pb.stock_qty > 0)\`);
    }
`;

code = code.replace(/if \(status === 'out_of_stock'\) {[\s\S]*?\} else if \(status === 'low_stock'\) {[\s\S]*?\}/, newLogic.trim());
fs.writeFileSync(file, code);
