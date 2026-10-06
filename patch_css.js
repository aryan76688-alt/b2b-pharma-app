const fs = require('fs');
const file = 'src/app/globals.css';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('overflow-x: hidden;')) {
  code = code.replace('user-select: none;', 'user-select: none;\n  overflow-x: hidden;');
  fs.writeFileSync(file, code);
}
