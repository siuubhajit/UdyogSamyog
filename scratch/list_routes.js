const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');
console.log('Total lines:', lines.length);
lines.forEach((l, i) => {
  if (/^\s*app\.(get|post|put|patch|delete)\(/.test(l)) {
    console.log((i + 1) + ': ' + l.trim());
  }
});
