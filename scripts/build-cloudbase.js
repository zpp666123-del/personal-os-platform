const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, '.cloudbase-dist');
const files = [
  'index.html',
  'styles.css',
  'app.js',
  'data.js',
  'cloudbase-config.js',
  'cloudbase-client.js',
  'cloudbase-api.js',
  'js/product-sections.js',
  '.nojekyll'
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of files) {
  const target = path.join(dist, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, file), target);
}

console.log(`CloudBase dist ready: ${path.relative(root, dist)}`);
