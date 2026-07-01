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
  '.nojekyll'
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}

console.log(`CloudBase dist ready: ${path.relative(root, dist)}`);
