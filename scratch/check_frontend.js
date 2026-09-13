const fs = require('fs');
const path = require('path');
const jsDir = 'public/js';
fs.readdirSync(jsDir).forEach(file => {
  if (!file.endsWith('.js')) return;
  const content = fs.readFileSync(path.join(jsDir, file), 'utf8');
  console.log('=== ' + file + ' ===');
  const matches = content.match(/\.(id|_id)\b|[a-zA-Z]+Id\b|\/api\/[a-zA-Z0-9_\-\/]+(\/|\$\{)/g);
  if (matches) {
    const unique = [...new Set(matches)].slice(0, 10);
    console.log(unique.join(', '));
  }
});
