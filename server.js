// 本地背书服务：读取 data/book-*.json，并把学习记录写入 data/learning-progress.json。
const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA_DIR, 'learning-progress.json');
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.json':'application/json; charset=utf-8' };
const CATEGORIES = ['简答', '论述', '名词解释'];

async function books() {
  const files = (await fsp.readdir(DATA_DIR)).filter(name => /^book-.*\.json$/i.test(name)).sort();
  const records = await Promise.all(files.map(async name => {
    const raw = JSON.parse(await fsp.readFile(path.join(DATA_DIR, name), 'utf8'));
    return { id: path.basename(name, '.json'), title: raw.title || path.basename(name, '.json'), description: raw.description || '', color: raw.color || '', categories: CATEGORIES, items: Array.isArray(raw.items) ? raw.items : [] };
  }));
  return records;
}
async function progress() {
  try { return JSON.parse(await fsp.readFile(STATE_FILE, 'utf8')); }
  catch (err) { if (err.code === 'ENOENT') return { progress:{}, activity:[], learnedDates:[] }; throw err; }
}
function reply(res, status, body, type = 'application/json; charset=utf-8') { res.writeHead(status, { 'Content-Type':type, 'Cache-Control':'no-store' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); }
function readBody(req) { return new Promise((resolve, reject) => { let body = ''; req.on('data', chunk => { body += chunk; if (body.length > 3e6) reject(new Error('请求内容过大')); }); req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('JSON 格式错误')); } }); }); }
function validItems(items) { return Array.isArray(items) && items.every(item => item && item.id && item.question && item.answer && CATEGORIES.includes(item.category)); }

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/api/books') return reply(res, 200, await books());
    if (req.method === 'GET' && url.pathname === '/api/state') return reply(res, 200, await progress());
    if (req.method === 'POST' && url.pathname === '/api/state') {
      const incoming = await readBody(req);
      const clean = { progress: incoming.progress && typeof incoming.progress === 'object' ? incoming.progress : {}, activity: Array.isArray(incoming.activity) ? incoming.activity.slice(0, 200) : [], learnedDates: Array.isArray(incoming.learnedDates) ? incoming.learnedDates : [] };
      const temp = `${STATE_FILE}.tmp`;
      await fsp.writeFile(temp, JSON.stringify(clean, null, 2), 'utf8');
      await fsp.rename(temp, STATE_FILE);
      return reply(res, 200, { ok:true });
    }
    const match = url.pathname.match(/^\/api\/books\/(book-[\w-]+)$/);
    if (req.method === 'POST' && match) {
      const incoming = await readBody(req);
      if (!validItems(incoming.items)) return reply(res, 400, { error:'每题均须有 id、category、question、answer；category 只能是简答、论述或名词解释。' });
      const target = path.join(DATA_DIR, `${match[1]}.json`);
      if (!fs.existsSync(target)) return reply(res, 404, { error:'题库文件不存在。' });
      await fsp.writeFile(target, JSON.stringify({ title: incoming.title || match[1], description: incoming.description || '', categories: CATEGORIES, color: incoming.color || '', items: incoming.items }, null, 2), 'utf8');
      return reply(res, 200, { ok:true });
    }
    if (req.method !== 'GET') return reply(res, 405, { error:'Method not allowed' });
    const requestPath = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = path.resolve(ROOT, `.${requestPath}`);
    if (!file.startsWith(ROOT + path.sep)) return reply(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
    const content = await fsp.readFile(file);
    return reply(res, 200, content.toString(), MIME[path.extname(file)] || 'application/octet-stream');
  } catch (err) {
    console.error(err);
    reply(res, err.code === 'ENOENT' ? 404 : 500, { error: err.message });
  }
}).listen(3210, '127.0.0.1', () => console.log('背书计划已启动：http://127.0.0.1:3210'));
