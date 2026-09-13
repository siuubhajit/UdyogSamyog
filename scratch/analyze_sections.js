const fs = require('fs');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');
console.log('Total lines:', lines.length);

let currentRoute = 'HEADER';
let routeLines = {};

lines.forEach((l, i) => {
  const m = l.match(/^\s*app\.(get|post|put|patch|delete)\(("[^"]+")/);
  if (m) {
    currentRoute = m[1].toUpperCase() + ' ' + m[2];
  }
  routeLines[currentRoute] = (routeLines[currentRoute] || 0) + 1;
});

Object.entries(routeLines).forEach(([r, count]) => {
  if (count > 20) {
    console.log(r + ': ' + count + ' lines');
  }
});

