const fs = require('fs');

function patch(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('WhatsAppButton')) {
    code = code.replace("import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';", "import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';\nimport { WhatsAppButton } from '@/components/orders/WhatsAppButton';");
    code = code.replace(/<div className="flex justify-between items-start mb-4">/g, "<div className=\"flex justify-between items-start mb-4\">\n              <WhatsAppButton order={order} partyName={order.partyName} />");
    fs.writeFileSync(file, code);
  }
}

patch('src/app/salesman/orders/[id]/page.tsx');
patch('src/app/owner/orders/[id]/page.tsx');
