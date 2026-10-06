const fs = require('fs');
const file = 'src/app/login/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /\{\/\* Quick Demo Credentials Bar \*\/\}.*?(?=\{\/\* Android APK Download Card \/ Banner \*\/\})/s;
code = code.replace(regex, '');

fs.writeFileSync(file, code);
