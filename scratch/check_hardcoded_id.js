const fs = require('fs');
const s = fs.readFileSync('server.js', 'utf8');
const lines = s.split('\n');
lines.forEach((l, i) => {
  if (l.match(/id\s*=\s*1\b|id\s*===\s*1\b|WHERE\s+id\s*=\s*1\b/i)) {
    console.log('server.js:' + (i + 1) + ': ' + l.trim());
  }
});
