const fs = require('fs');
const path = require('path');
const jsDir = 'public/js';
fs.readdirSync(jsDir).forEach(file => {
  if (!file.endsWith('.js')) return;
  const content = fs.readFileSync(path.join(jsDir, file), 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('parseInt') && (l.includes('id') || l.includes('Id'))) {
      console.log(file + ':' + (i + 1) + ' -> ' + l.trim());
    }
  });
});
