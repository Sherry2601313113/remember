/* 题库与学习记录均由本地服务读取/写入 data 文件夹。 */
const INTERVALS = [1, 3, 7, 15, 30]; // 单位：天，首次记住后从明天开始
const CATEGORIES = ['简答', '论述', '名词解释'];
let state = { books: [], progress: {}, activity: [], learnedDates: [] };
let activeCard = null;
let reviewMode = false;
let studyScope = { bookId: null, category: null };
let studyQueue = [];

async function loadFromDisk() { const [books, saved] = await Promise.all([fetch('/api/books').then(r => r.json()), fetch('/api/state').then(r => r.json())]); state = { books, progress: saved.progress || {}, activity: saved.activity || [], learnedDates: saved.learnedDates || [] }; }
function saveState() { fetch('/api/state', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ progress:state.progress, activity:state.activity, learnedDates:state.learnedDates }) }).catch(() => alert('学习记录暂未写入硬盘，请确认“启动网站.cmd”仍在运行。')); }
function getAllItems() { return state.books.flatMap(book => book.items.map(item => ({ ...item, book }))); }
function localDay(date = new Date()) { const d = new Date(date); d.setHours(0,0,0,0); return d; }
function plusDays(date, days) { const d = localDay(date); d.setDate(d.getDate() + days); return d.getTime(); }
function dateKey(time = Date.now()) { return new Date(time).toLocaleDateString('sv-SE'); }
function isDue(item) { const p = state.progress[item.id]; return !p || p.nextReview <= Date.now(); }
function learned(item) { return Boolean(state.progress[item.id]); }
function dueItems() { return getAllItems().filter(isDue).sort((a,b) => (state.progress[a.id]?.nextReview||0) - (state.progress[b.id]?.nextReview||0)); }
function mastered(item) { return (state.progress[item.id]?.successes || 0) >= 4; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function updateClock() { const now = new Date(); document.querySelector('#clock').textContent = now.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}); document.querySelector('#dateText').textContent = now.toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'}); }
function updateDashboard() {
  const all = getAllItems(), due = dueItems(), today = dateKey();
  const done = state.activity.filter(x => dateKey(x.time) === today).length;
  document.querySelector('#dueBadge').textContent = due.length;
  document.querySelector('#dueCount').textContent = due.length;
  document.querySelector('#todayDone').textContent = done;
  document.querySelector('#masteredCount').textContent = all.filter(mastered).length;
  document.querySelector('#streakDays').textContent = streak();
  document.querySelector('#todayDescription').textContent = due.length ? `有 ${due.length} 道内容在今天到期。回忆后再看答案，效果更好。` : '今天没有到期复习；也可以开始学习一道新内容。';
}
function streak() { const days = [...new Set(state.learnedDates)].sort().reverse(); let count = 0, d = localDay(); for (const key of days) { if (key === dateKey(d)) { count++; d.setDate(d.getDate()-1); } else if (key < dateKey(d)) break; } return count; }
function shuffle(items) { return [...items].sort(() => Math.random() - .5); }
function scopedItems() { const all = getAllItems(); if (!studyScope.bookId) return dueItems(); return all.filter(item => item.book.id === studyScope.bookId && (!studyScope.category || item.category === studyScope.category)); }
function setStudyScope(bookId = null, category = null) { studyScope = { bookId, category }; studyQueue = []; activeCard = null; }
function chooseNext() { const candidates = scopedItems(); if (!candidates.length) { activeCard = null; renderStudyCard(); return; } const candidateIds = new Set(candidates.map(item => item.id)); studyQueue = studyQueue.filter(id => candidateIds.has(id) && id !== activeCard?.id); if (!studyQueue.length) studyQueue = shuffle(candidates.filter(item => item.id !== activeCard?.id).map(item => item.id)); const nextId = studyQueue.shift() || candidates[0].id; activeCard = candidates.find(item => item.id === nextId) || candidates[0]; renderStudyCard(); }
function renderStudyCard() { const stage = document.querySelector('#cardStage'); const title = document.querySelector('#taskTitle'); if (!activeCard) { title.textContent = studyScope.bookId ? '这部分已经没有题目' : '准备好开始了吗？'; stage.innerHTML = `<div class="empty-state"><span class="empty-icon">✓</span><h3>${studyScope.bookId ? '请为这一部分添加题目' : '今天的复习已经完成'}</h3><p>${studyScope.bookId ? '可以返回书架，选择其他分类或全部背诵。' : '可以去随机抽查，或从书本中开始新的内容。'}</p><button class="primary-button" data-go-view="books">返回书架</button></div>`; return; } if (studyScope.bookId) { const book = state.books.find(b => b.id === studyScope.bookId); title.textContent = `${book?.title || '本书'}${studyScope.category ? ` · ${studyScope.category}` : ' · 全部背诵'}`; } else { title.textContent = learned(activeCard) ? '到期复习' : '学习新内容'; } renderQuestion(stage, activeCard, false); }
function renderQuestion(stage, item, isReview) {
  const tpl = document.querySelector('#questionTemplate').content.cloneNode(true);
  tpl.querySelector('.book-pill').textContent = item.book.title;
  const p = state.progress[item.id];
  const roundLabel = isReview ? `抽查 · 曾遗忘 ${p?.forgets||0} 次` : (p ? `第 ${p.successes + p.forgets + 1} 次复习` : '首次学习');
  tpl.querySelector('.review-label').textContent = `${item.category || '未分类'} · ${roundLabel}`;
  tpl.querySelector('.question-text').textContent = item.question;
  tpl.querySelector('.answer-text').textContent = item.answer;
  const reveal = tpl.querySelector('.reveal-button'), answer = tpl.querySelector('.answer-wrap'), grades = tpl.querySelector('.grade-actions');
  reveal.addEventListener('click', () => { reveal.classList.add('hidden'); answer.classList.remove('hidden'); grades.classList.remove('hidden'); });
  tpl.querySelector('.forget-button').addEventListener('click', () => grade(item, false, isReview));
  tpl.querySelector('.remember-button').addEventListener('click', () => grade(item, true, isReview));
  stage.replaceChildren(tpl);
}
function grade(item, remembered, fromReview) {
  const before = state.progress[item.id] || { successes:0, forgets:0 };
  const successes = remembered ? before.successes + 1 : 0;
  const forgets = remembered ? before.forgets : before.forgets + 1;
  const interval = remembered ? INTERVALS[Math.min(successes - 1, INTERVALS.length - 1)] : 1;
  state.progress[item.id] = { successes, forgets, nextReview: plusDays(new Date(), interval), lastReview: Date.now() };
  const today = dateKey(); if (!state.learnedDates.includes(today)) state.learnedDates.push(today);
  state.activity.unshift({ time: Date.now(), itemId:item.id, question:item.question, result:remembered ? '记住' : '遗忘', fromReview }); state.activity = state.activity.slice(0, 80);
  saveState(); updateDashboard(); renderBooks(); renderStats();
  if (fromReview) startRandomReview(); else chooseNext();
}
function startBook(id, category = '') { const book = state.books.find(b => b.id === id); const items = category ? book?.items.filter(i => i.category === category) : book?.items; if (!items?.length) { alert(category ? `《${book.title}》还没有“${category}”题目。` : '这本书还没有题目。请编辑 data 文件后在页面右上角导入 JSON。'); return; } setStudyScope(id, category || null); switchView('today'); chooseNext(); }
function renderBooks() { const host = document.querySelector('#bookGrid'); host.innerHTML = state.books.map((book, index) => { const done = book.items.filter(learned).length; const categories = book.categories || CATEGORIES; const categoryButtons = categories.map(category => `<button class="category-button" data-start-book-category="${book.id}" data-category="${category}">${category} ${book.items.filter(i => i.category === category).length}</button>`).join(''); return `<article class="book-card" style="--book-color:${book.color || '#2863eb'}"><span class="book-number">BOOK 0${index+1}</span><h2>${escapeHtml(book.title)}</h2><p>${escapeHtml(book.description || '导入题库开始学习')}</p><div class="book-meta"><b>${done}</b> / ${book.items.length} 已学习<div class="category-list">${categoryButtons}</div></div><div class="book-actions"><button class="primary-button" data-start-book="${book.id}">全部背诵</button><button class="secondary-button" data-book-info="${book.id}">查看进度</button></div></article>`; }).join(''); }
function randomWeighted(items) { const bag = items.flatMap(item => Array(1 + (state.progress[item.id]?.forgets || 0) * 4 + Math.max(0, 3 - (state.progress[item.id]?.successes || 0))).fill(item)); return bag[Math.floor(Math.random() * bag.length)]; }
function startRandomReview() { const pool = getAllItems().filter(learned); const stage = document.querySelector('#reviewStage'); const note = document.querySelector('#reviewAvailability'); note.textContent = pool.length ? `已从 ${pool.length} 道学过的内容中，为你按薄弱程度加权抽题。` : '先完成至少一道学习内容，即可开始抽查。'; if (!pool.length) { stage.innerHTML = ''; return; } const item = randomWeighted(pool); renderQuestion(stage, item, true); }
function renderStats() { const all = getAllItems(), ps = Object.values(state.progress); const success = state.activity.filter(x=>x.result==='记住').length, wrong = state.activity.filter(x=>x.result==='遗忘').length; const rate = success + wrong ? Math.round(success/(success+wrong)*100) : 0; document.querySelector('#statsGrid').innerHTML = [`<article class="stat-box"><span>题库总数</span><strong>${all.length}</strong><small>三本书合计</small></article>`,`<article class="stat-box"><span>已学习内容</span><strong>${ps.length}</strong><small>正在形成记忆</small></article>`,`<article class="stat-box"><span>回忆正确率</span><strong>${rate}%</strong><small>记住 ${success} 次</small></article>`,`<article class="stat-box"><span>需要重点巩固</span><strong>${all.filter(i=>(state.progress[i.id]?.forgets||0)>0).length}</strong><small>曾出现遗忘</small></article>`].join(''); const acts = state.activity.slice(0,10); document.querySelector('#activityList').innerHTML = acts.length ? acts.map(a=>`<div class="activity-line"><div>${escapeHtml(a.question.slice(0,34))}${a.question.length>34?'…':''}<span> · ${new Date(a.time).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div><b class="${a.result==='记住'?'success':'error'}">${a.result}</b></div>`).join('') : '<div class="activity-line"><span>还没有学习记录，开始第一道题吧。</span></div>'; }
function switchView(id) { document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id)); document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===id)); if (id === 'review') startRandomReview(); if (id === 'stats') renderStats(); }
function importBook(file) { const reader = new FileReader(); reader.onload = async () => { try { const imported = JSON.parse(reader.result); if (!Array.isArray(imported.items) || !imported.items.every(i => i.id && i.category && i.question && i.answer && CATEGORIES.includes(i.category))) throw new Error('每道题必须包含 id、category、question、answer；category 只能是简答、论述或名词解释。'); const matching = state.books.find(b => b.title === imported.title); const empty = state.books.find(b => b.items.length === 0); const target = matching || empty; if (!target) throw new Error('三本题库已满；请直接编辑 data 文件夹中的对应 JSON。'); const response = await fetch(`/api/books/${target.id}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ...imported, categories:CATEGORIES, color:target.color }) }); if (!response.ok) throw new Error((await response.json()).error || '写入失败'); await loadFromDisk(); renderBooks(); updateDashboard(); renderStats(); alert(`已写入硬盘：${target.id}.json，共 ${imported.items.length} 道题目。`); } catch (err) { alert(`导入失败：${err.message || '请检查 JSON 格式。'}`); } }; reader.readAsText(file, 'UTF-8'); }
function exportData() { const blob = new Blob([JSON.stringify({ exportedAt:new Date().toISOString(), progress:state.progress, activity:state.activity },null,2)], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`背书学习记录-${dateKey()}.json`; a.click(); URL.revokeObjectURL(a.href); }
document.addEventListener('click', e => { const nav=e.target.closest('.nav-item'); if(nav) { if (nav.dataset.view === 'today') { setStudyScope(); chooseNext(); } switchView(nav.dataset.view); } const go=e.target.closest('[data-go-view]'); if(go) switchView(go.dataset.goView); const categoryStart=e.target.closest('[data-start-book-category]'); if(categoryStart) startBook(categoryStart.dataset.startBookCategory, categoryStart.dataset.category); const start=e.target.closest('[data-start-book]'); if(start) startBook(start.dataset.startBook); const info=e.target.closest('[data-book-info]'); if(info) { const b=state.books.find(x=>x.id===info.dataset.bookInfo); alert(`《${b.title}》：共 ${b.items.length} 道题，已学习 ${b.items.filter(learned).length} 道。`); } });
document.querySelector('#skipBtn').addEventListener('click', chooseNext); document.querySelector('#startReviewBtn').addEventListener('click', startRandomReview); document.querySelector('#fileInput').addEventListener('change',e=>e.target.files[0]&&importBook(e.target.files[0])); document.querySelector('#exportBtn').addEventListener('click',exportData);
async function boot() { updateClock(); setInterval(updateClock, 1000); try { await loadFromDisk(); updateDashboard(); renderBooks(); renderStats(); chooseNext(); } catch { document.querySelector('#cardStage').innerHTML = '<div class="empty-state"><span class="empty-icon">!</span><h3>请先启动本地服务</h3><p>双击“启动网站.cmd”，再在浏览器打开 http://127.0.0.1:3210。</p></div>'; } }
boot();
