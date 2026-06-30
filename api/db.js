const fs = require('fs');
const path = require('path');
const vm = require('vm');

let db;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(body));
}

function seedDB() {
  const code = fs.readFileSync(path.join(process.cwd(), 'data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: 'data.js' });
  return JSON.parse(JSON.stringify(sandbox.window.AbilityOSV7.SEED_DB));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) reject(new Error('Body too large'));
    });
    req.on('end', () => resolve(body ? JSON.parse(body) : {}));
    req.on('error', reject);
  });
}

function validDB(value) {
  return value
    && typeof value.version === 'string'
    && Array.isArray(value.users)
    && Array.isArray(value.profiles)
    && Array.isArray(value.leads);
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  db = db || seedDB();

  if (req.method === 'GET') return json(res, 200, { ok: true, db });

  if (req.method === 'POST') {
    try {
      const body = await readBody(req);
      if (!validDB(body)) return json(res, 400, { ok: false, error: 'Invalid database payload' });
      // ponytail: in-memory store; replace with Supabase when persistence matters.
      db = body;
      return json(res, 200, { ok: true, db });
    } catch (err) {
      return json(res, 400, { ok: false, error: err.message || 'Bad request' });
    }
  }

  return json(res, 405, { ok: false, error: 'Method not allowed' });
};
