const fs = require('fs');
const file = 'src/app/salesman/dashboard/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("ShoppingCart,", "ShoppingCart,\n  Banknote,");

fs.writeFileSync(file, code);
