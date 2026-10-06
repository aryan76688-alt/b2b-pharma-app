const fs = require('fs');

function patch(file) {
  let code = fs.readFileSync(file, 'utf8');
  if (!code.includes('generateInvoicePDF')) {
    code = code.replace("import { WhatsAppButton } from '@/components/orders/WhatsAppButton';", "import { WhatsAppButton } from '@/components/orders/WhatsAppButton';\nimport { generateInvoicePDF } from '@/lib/pdf';\nimport { FileDown } from 'lucide-react';");
    
    const pdfButton = `
              <Button 
                onClick={() => generateInvoicePDF(order, party)}
                variant="outline"
                className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200 text-xs py-1 h-8 flex items-center gap-1.5 ml-2"
              >
                <FileDown className="w-4 h-4" />
                PDF Invoice
              </Button>`;
              
    code = code.replace("<WhatsAppButton order={order} partyName={order.partyName} />", "<WhatsAppButton order={order} partyName={order.partyName} />" + pdfButton);
    fs.writeFileSync(file, code);
  }
}

patch('src/app/owner/orders/[id]/page.tsx');
patch('src/app/salesman/orders/[id]/page.tsx');
