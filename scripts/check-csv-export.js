const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const app = fs.readFileSync('app.js', 'utf8');
const match = app.match(/function csvCell\(value\) \{[\s\S]*?\n  \}/);
assert.ok(match, 'csvCell function not found');

const csvCell = vm.runInNewContext(`${match[0]}; csvCell`);

assert.equal(csvCell('=1+1'), '"\'=1+1"');
assert.equal(csvCell('+cmd'), '"\'+cmd"');
assert.equal(csvCell('a"b'), '"a""b"');
assert.equal(csvCell('line\nbreak'), '"line break"');
assert.equal(csvCell(null), '""');
