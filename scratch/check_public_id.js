const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      searchDir(full);
    } else if (file.endsWith('.js') || file.endsWith('.html')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        if (l.match(/id\s*=\s*['"]?1['"]?\b/i) && !l.includes('role=') && !l.includes('is_apex') && !l.includes('is_banned')) {
          console.log(`${full}:${i + 1}: ${l.trim()}`);
        }
      });
    }
  });
}

searchDir('public');

