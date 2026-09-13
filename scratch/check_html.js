const fs = require('fs');
const path = require('path');
const pDir = 'public/pages';
fs.readdirSync(pDir).forEach(file => {
  if (!file.endsWith('.html')) return;
  const content = fs.readFileSync(path.join(pDir, file), 'utf8');
  if (content.includes('parseInt') || content.includes('Number(')) {
    console.log(file + ' has parseInt or Number');
  }
});
