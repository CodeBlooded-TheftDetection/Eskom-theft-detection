const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname);
const pattern = /const\s+BASE_URL\s*=\s*['\"]http:\/\/localhost:3000['\"];/g;
let count = 0;
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, item.name);
    if (item.isDirectory()) {
      walk(filePath);
    } else if (/\.(js|html)$/i.test(item.name)) {
      let text = fs.readFileSync(filePath, 'utf8');
      const newText = text
        .replace(pattern, "const BASE_URL = '';" )
        .replace('fetch("http://localhost:3000/api/auth/login"', 'fetch("/api/auth/login"')
        .replace("fetch('http://localhost:3000/api/auth/login'", "fetch('/api/auth/login'");
      if (newText !== text) {
        fs.writeFileSync(filePath, newText, 'utf8');
        count += 1;
      }
    }
  }
}
walk(root);
console.log(`Updated ${count} files`);
