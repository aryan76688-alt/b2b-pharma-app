const fs = require('fs');

const file = 'src/app/salesman/orders/create/page.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const pos = await new Promise((resolve, reject) => {',
  'const pos = await new Promise<GeolocationPosition>((resolve, reject) => {'
);

fs.writeFileSync(file, code);
