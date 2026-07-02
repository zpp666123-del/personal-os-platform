(function () {
  'use strict';

  const root = document.getElementById('app');
  const toast = document.getElementById('toast');
  const palette = document.getElementById('commandPalette');
  const glow = document.getElementById('cursorGlow');
  const OS = window.AbilityOSV7;
  let recordIndex = 0;
  let saveTimer = null;
  let saveSeq = 0;
  let saveAbort = null;
  let publishing = false;
  const visitMemory = new Set();
  const runtime = {
    db: null,
    useCloudBase: false,
    hydrating: false
  };

  const sections = window.PersonalOSSections || [
    ['identity', '个人身份', '姓名、定位、头像与主页文案'],
    ['assets', '社交/IP 聚合', '社媒、链接、二维码入口'],
    ['projects', '精选项目', '项目案例与能力证据'],
    ['posts', '作品资产', '文章、视频、复盘与作品链接'],
    ['resume', '工作/履历', '教育、工作、项目经历'],
    ['contact', '合作方式', '联系表单、发布与导出'],
    ['visibility', '隐私可见性', '公开、详情、联系后可见']
  ];

  const visibilityOptions = [
    ['public', '公开展示'],
    ['details', '简历详情'],
    ['request', '联系后可见'],
    ['pdf', '仅 PDF'],
    ['private', '仅自己可见'],
  ];

  const fieldLabels = {
    name: '姓名 / 昵称', title: '身份定位', city: '所在城市', location: '地区英文', status: '开放状态', website: '个人域名', email: '邮箱', phone: '手机号', wechat: '微信', age: '年龄', gender: '性别', residence: '居住地', expectedLocation: '期望地点', expectedRole: '期望角色', expectedSalary: '期望薪资', availability: '可开始时间', education: '学历 / 专业', major: '专业', work: '工作经历', projectExperiences: '项目经历详情', certificates: '证书 / 奖项', resumePdf: 'PDF 简历'
  };

  const emptyItem = {
    proof: { title: '新的能力证据', desc: '写下这项能力如何被证明。', tags: ['证据'] },
    projects: { title: '新的项目案例', summary: '一句话说明项目解决的问题、你的角色和结果。', tags: ['MVP'], url: '#', coverUrl: '' },
    assets: { type: 'website', label: '新的数字资产', value: '链接或账号', url: '#' },
    posts: { title: '新的内容标题', meta: '类型 · 日期', views: '0', url: '#', coverUrl: '' },
    'resume.education': { period: '2020 — 2024', school: '学校名称', degree: '本科', major: '专业', city: '城市', desc: '简要描述学习方向、项目或成果。' },
    'resume.work': { period: '2026 — 至今', company: '公司 / 项目', role: '职位 / 角色', location: '城市 / 远程', desc: '写下职责与关键工作。', result: '写下可验证结果。' },
    'resume.projectExperiences': { period: '2026', title: '项目名称', role: '你的角色', desc: '项目背景、问题和你的行动。', result: '结果和证据。', stack: ['Tech'] },
    'resume.certificates': { name: '证书 / 奖项', issuer: '颁发方', date: '2026', url: '#' },
    'progress.records': { day: 1, date: 'Today', title: '新的能力记录', revenue: '+1', expense: '-0', net: '+1', note: '记录今天新增的项目、内容或反馈。' },
  };

  const assetIcons = { github: 'GH', blog: '✎', social: '◎', portfolio: '▣', email: '@', qr: '▦', website: '↗', linkedin: 'in', bilibili: 'B', notion: 'N', default: '✦' };
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const esc = (value) => String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const asTags = (value) => Array.isArray(value) ? value.map(String).filter(Boolean) : String(value || '').split(/[，,\n]/).map((x) => x.trim()).filter(Boolean);
  const tag = (value) => `<span class="tag">${esc(value)}</span>`;
  const assetIcon = (type) => assetIcons[type] || assetIcons.default;
  function mediaUrl(value, kind = 'image') {
    const url = String(value || '').trim();
    if (!url || url === '#') return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (kind === 'image' && /^data:image\//i.test(url)) return url;
    return '';
  }

  function avatarNode(p, cls = '') {
    const label = p.identity.avatar || p.identity.name.slice(0, 2);
    const src = mediaUrl(p.identity.avatarUrl);
    return src
      ? `<div class="avatar has-image ${cls}"><img src="${esc(src)}" alt="${esc(p.identity.name || '头像')}" loading="lazy" /></div>`
      : `<div class="avatar ${cls}">${esc(label)}</div>`;
  }

  function loadLocalDB() {
    try {
      const raw = localStorage.getItem(OS.STORAGE_KEY);
      if (!raw) return clone(OS.SEED_DB);
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== OS.SEED_DB.version) return clone(OS.SEED_DB);
      return parsed;
    } catch (err) {
      return clone(OS.SEED_DB);
    }
  }

  function loadDB() {
    if (!runtime.db) runtime.db = loadLocalDB();
    return runtime.db;
  }

  function saveDB(db, options = {}) {
    runtime.db = db;
    if (runtime.useCloudBase) {
      if (!options.localOnly) scheduleDraftSave();
      return;
    }
    localStorage.setItem(OS.STORAGE_KEY, JSON.stringify(db));
  }

  function currentUser(db = loadDB()) {
    return db.users.find((u) => u.id === db.currentUserId) || db.users[0];
  }

  function currentProfile(db = loadDB()) {
    const user = currentUser(db);
    return db.profiles.find((p) => p.ownerId === user.id) || db.profiles[0];
  }

  function profileByHandle(handle, db = loadDB()) {
    return db.profiles.find((p) => p.handle === handle) || db.profiles[0];
  }

  function ensure(row) {
    row.draft = row.draft || clone(OS.DEFAULT_PROFILE);
    row.published = row.published || clone(row.draft);
    return row.draft;
  }

  function api() {
    return window.AbilityCloudBaseAPI;
  }

  function needsAuth(path = routePath()) {
    return path === 'dashboard' || path === 'inbox' || path.startsWith('studio');
  }

  function upsertUser(user) {
    if (!user) return;
    const db = loadDB();
    const row = {
      id: user.id,
      name: (user.email || 'user').split('@')[0],
      email: user.email || '',
      createdAt: user.created_at || new Date().toISOString()
    };
    const index = db.users.findIndex((x) => x.id === row.id);
    if (index >= 0) db.users[index] = { ...db.users[index], ...row };
    else db.users.push(row);
    db.currentUserId = row.id;
  }

  function upsertProfile(row, options = {}) {
    if (!row) return null;
    const db = loadDB();
    const index = db.profiles.findIndex((p) => p.id === row.id || p.handle === row.handle);
    if (index >= 0) {
      const existing = db.profiles[index];
      db.profiles[index] = {
        ...existing,
        ...row,
        published: row.published || existing.published,
        publishedAt: row.publishedAt || existing.publishedAt
      };
    }
    else db.profiles.push(row);
    if (options.current) db.currentUserId = row.ownerId;
    return index >= 0 ? db.profiles[index] : row;
  }

  async function loadRemoteWorkspace(options = {}) {
    const service = api();
    if (!service) return null;
    const user = await service.getUser();
    if (!user) return null;
    upsertUser(user);
    const row = upsertProfile(await service.loadMyProfile(OS.DEFAULT_PROFILE), { current: true });
    const db = loadDB();
    try {
      db.leads = await service.loadMyLeads(row.id);
    } catch (err) {
      console.warn(err);
      db.leads = [];
    }
    try {
      db.views = await service.loadMyViews(row.id);
    } catch (err) {
      console.warn(err);
      db.views = [];
    }
    saveDB(db, { localOnly: true });
    if (options.render !== false) render(false);
    return row;
  }

  async function loadRemotePublished(handle, options = {}) {
    const service = api();
    if (!service) return null;
    const row = await service.loadPublishedProfile(handle);
    if (!row) return null;
    upsertProfile(row);
    saveDB(loadDB(), { localOnly: true });
    if (options.render !== false) render(false);
    return row;
  }

  function trackLocalVisit(row, source) {
    const db = loadDB();
    db.views = db.views || [];
    db.views.push({
      id: `view_${Date.now()}`,
      profileId: row.id,
      profileHandle: row.handle,
      source,
      createdAt: new Date().toISOString()
    });
    saveDB(db, { localOnly: runtime.useCloudBase });
  }

  async function trackVisit(row, source = 'public_profile') {
    if (!row || !row.handle) return;
    const key = `visit:${row.handle}:${source}`;
    if (visitMemory.has(key)) return;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch (err) {
      console.warn(err);
    }
    visitMemory.add(key);
    if (runtime.useCloudBase && api()) {
      try {
        await api().trackVisit(row.handle, source);
      } catch (err) {
        console.warn(err);
      }
      return;
    }
    trackLocalVisit(row, source);
  }

  async function hydrateFromCloudBase() {
    const service = api();
    if (!service || runtime.hydrating || !(await service.isEnabled())) return;
    runtime.useCloudBase = true;
    runtime.hydrating = true;
    try {
      const path = routePath();
      if (path.startsWith('u/') || path.startsWith('resume/')) {
        await loadRemotePublished(path.split('/')[1] || 'cj', { render: false });
      }
      const user = await service.getUser();
      if (user) await loadRemoteWorkspace({ render: false });
      else if (needsAuth(path)) navigate('login');
      render(false);
    } catch (err) {
      console.warn(err);
      runtime.useCloudBase = false;
      showToast(location.protocol === 'file:' ? 'CloudBase 暂不可用，已显示本地 Demo' : 'CloudBase 配置异常，已显示本地 Demo');
    } finally {
      runtime.hydrating = false;
    }
  }

  function scheduleDraftSave() {
    const service = api();
    if (!service) return;
    const seq = ++saveSeq;
    if (saveAbort) saveAbort.abort();
    const controller = new AbortController();
    saveAbort = controller;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        if (!(await service.getUser())) return;
        const row = currentProfile(loadDB());
        if (!row || !row.id) return;
        const saved = await service.saveDraft(row, controller.signal);
        if (seq === saveSeq && !controller.signal.aborted) upsertProfile(saved, { current: true });
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn(err);
        const message = String(err.message || '').toLowerCase();
        showToast(message.includes('duplicate') || message.includes('unique') ? '主页 handle 已被占用' : '草稿保存失败，请稍后重试');
      } finally {
        if (seq === saveSeq) saveAbort = null;
      }
    }, 600);
  }

  function getPath(obj, path) {
    return path.split('.').reduce((acc, key) => acc == null ? undefined : acc[key], obj);
  }

  function setPath(obj, path, value) {
    const parts = path.split('.');
    const last = parts.pop();
    const target = parts.reduce((acc, key) => {
      if (acc[key] == null || typeof acc[key] !== 'object') acc[key] = {};
      return acc[key];
    }, obj);
    target[last] = value;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2100);
  }

  function routePath() {
    const hash = (location.hash || '').replace(/^#\/?/, '');
    if (hash) return hash || 'home';
    const parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    if (!last || last === 'index.html') return 'home';
    const uIndex = parts.indexOf('u');
    if (uIndex >= 0 && parts[uIndex + 1]) return `u/${parts[uIndex + 1]}`;
    const rIndex = parts.indexOf('resume');
    if (rIndex >= 0 && parts[rIndex + 1]) return `resume/${parts[rIndex + 1]}`;
    const known = ['home', 'dashboard', 'studio', 'templates', 'pricing', 'inbox', 'login', 'signup', 'terms', 'privacy'];
    return known.includes(last) ? last : 'home';
  }

  function navigate(path) {
    location.hash = `#/${path.replace(/^\//, '')}`;
  }

  function canShow(p, key, context = 'public') {
    const value = (p.visibility || {})[key] || 'public';
    if (context === 'public') return value === 'public';
    if (context === 'details') return value === 'public' || value === 'details';
    if (context === 'pdf') return value === 'public' || value === 'details' || value === 'pdf';
    return false;
  }

  function visibleValue(p, key, value, context = 'public', fallback = '联系后可见') {
    return canShow(p, key, context) ? esc(value || '') : `<span class="muted">${fallback}</span>`;
  }

  function prettyBaseUrl() {
    if (location.origin && location.origin !== 'null') return location.origin;
    return 'https://your-domain.example';
  }

  function publicUrl(row) {
    return `${prettyBaseUrl()}/u/${row.handle}`;
  }

  function resumeUrl(row) {
    return `${prettyBaseUrl()}/resume/${row.handle}`;
  }

  function appHeader(row, active) {
    return `
      <header class="top-nav mature-nav app-nav">
        <a class="brand-pill magnetic" href="#/home" aria-label="回到首页">
          <span class="brand-mark" aria-hidden="true"></span>
          <span>个人能力 OS</span>
          <small class="brand-status">Beta</small>
        </a>
        <nav class="nav-pill" aria-label="应用导航">
          <a class="${active('dashboard')}" href="#/dashboard">工作台</a>
          <a class="${active('studio')}" href="#/studio/identity">编辑器</a>
          <a class="${active('templates')}" href="#/templates">模板</a>
          <a class="${active('inbox')}" href="#/inbox">线索</a>
          <a class="${active('pricing')}" href="#/pricing">定价</a>
        </nav>
        <div class="nav-actions">
          <button class="icon-btn magnetic" type="button" data-action="open-command" aria-label="打开命令台">⌘</button>
          <a class="top-cta magnetic" href="#/u/${esc(row.handle)}">公开页</a>
          ${runtime.useCloudBase ? '<button class="top-cta light magnetic" type="button" data-action="logout">退出</button>' : ''}
        </div>
      </header>`;
  }

  function marketingHeader(row, active) {
    return `
      <header class="top-nav mature-nav marketing-nav">
        <a class="brand-pill magnetic" href="#/home" aria-label="回到首页">
          <span class="brand-mark" aria-hidden="true"></span>
          <span>个人能力 OS</span>
          <small class="brand-status soft">Productized</small>
        </a>
        <nav class="nav-pill" aria-label="产品导航">
          <a class="${active('home')}" href="#/home">产品</a>
          <a class="${active('templates')}" href="#/templates">模板</a>
          <a class="${active('pricing')}" href="#/pricing">定价</a>
          <a href="#/u/${esc(row.handle)}">示例页</a>
        </nav>
        <div class="nav-actions">
          <a class="top-cta light magnetic" href="#/login">登录</a>
          <a class="top-cta magnetic" href="#/signup">注册</a>
        </div>
      </header>`;
  }

  function readerHeader(row, p) {
    return `
      <header class="reader-nav">
        <a class="reader-brand" href="#/u/${esc(row.handle)}" aria-label="公开主页顶部">
          ${avatarNode(p, 'mini')}
          <span><b>${esc(canShow(p, 'name') ? p.identity.name : '公开主页')}</b><small>${esc(p.identity.title || '个人能力主页')}</small></span>
        </a>
        <nav class="reader-links" aria-label="公开主页导航">
          <button type="button" data-action="scroll-to" data-target="proof">证据</button>
          <button type="button" data-action="open-resume">简历</button>
          <a href="#/resume/${esc(row.handle)}">网页版简历</a>
          <button type="button" data-action="scroll-to" data-target="contact">联系</button>
        </nav>
        <a class="reader-cta" href="#/home">用个人能力 OS 创建</a>
      </header>`;
  }

  function shell(content, options = {}) {
    const db = loadDB();
    const row = options.profileRow || currentProfile(db);
    const p = options.profile || ensure(row);
    const path = routePath();
    const active = (name) => path === name || path.startsWith(`${name}/`) ? 'active' : '';
    let header = '';
    if (!options.noHeader) {
      if (options.mode === 'marketing') header = marketingHeader(row, active);
      else if (options.mode === 'reader') header = readerHeader(row, p);
      else header = appHeader(row, active);
    }
    const footerText = options.mode === 'reader'
      ? '公开链接可直接分享给面试官、合作方或朋友阅读。'
      : '成熟产品方向：主页生成、资料治理、发布、线索与模板。';
    const footer = options.noFooter ? '' : `<footer class="footer mature-footer"><b>个人能力 OS</b><span>${footerText}</span><span>V8 Productized · ${runtime.useCloudBase ? 'CloudBase' : 'Demo'} MVP</span></footer>`;
    return `${header}${content}${footer}`;
  }

  function landingPage() {
    const db = loadDB();
    const row = currentProfile(db);
    const p = ensure(row);
    return shell(`
      <main class="page product-page">
        <section class="product-hero" data-reveal>
          <div class="hero-copy">
            <p class="eyebrow">Personal Website Platform</p>
            <h1 class="hero-title">把个人能力，做成一个<span class="mark">成熟的在线产品。</span></h1>
            <p class="lede">从个人样板开始，但用平台级结构来设计：资料档案、证据库、简历抽屉、模板系统、发布流程、线索收件箱与隐私可见性，全部围绕“可验证、可连接、可成交”的个人主页。</p>
            <div class="actions">
              <a class="btn primary magnetic" href="#/signup">创建我的主页</a>
              <a class="btn ghost magnetic" href="#/dashboard">进入产品工作台</a>
              <a class="btn ghost magnetic" href="#/pricing">查看产品版本</a>
            </div>
            <div class="product-trust-row">
              <span><b>Draft / Publish</b> 草稿与发布分离</span>
              <span><b>Privacy Control</b> 字段可见性</span>
              <span><b>Lead Inbox</b> 合作线索闭环</span>
            </div>
          </div>
          <div class="product-console tilt-card motion-card">
            <div class="console-top"><i></i><i></i><i></i><span>app.abilityos.site</span></div>
            <div class="console-grid">
              <article class="console-primary">
                <span class="pill">Profile Health</span>
                <h3>82%</h3>
                <p>主页完成度、证据数量、联系方式、简历完整度综合评分。</p>
                <div class="health-bar"><span style="width:82%"></span></div>
              </article>
              <article><b>公开页</b><span>/u/${esc(row.handle)}</span></article>
              <article><b>模板</b><span>${esc(row.templateId)}</span></article>
              <article><b>线索</b><span>${db.leads.filter((l) => l.profileId === row.id).length} 条</span></article>
              <article><b>状态</b><span>已发布</span></article>
            </div>
          </div>
        </section>

        <section class="section product-spine" data-reveal>
          <div class="section-head split">
            <div><p class="section-kicker">Product Spine</p><h2>不是一次性页面，而是一套可长期运营的个人资料系统。</h2></div>
            <p>成熟产品的关键不是页面多，而是核心对象清楚：Profile、Evidence、Resume、Template、Lead、Publish。每个对象都有自己的编辑、预览、发布和隐私规则。</p>
          </div>
          <div class="mature-feature-grid">
            <article class="mature-feature tilt-card motion-card"><span>01</span><h3>Profile Studio</h3><p>像设置账号资料一样编辑主页，左侧模块、中间内容、右侧实时预览。</p></article>
            <article class="mature-feature tilt-card motion-card"><span>02</span><h3>Evidence Library</h3><p>把项目、内容、GitHub、作品集沉淀成可验证证据，而不是散落链接。</p></article>
            <article class="mature-feature tilt-card motion-card"><span>03</span><h3>Resume Vault</h3><p>公开页只展示摘要，完整学历、工作、项目经历通过简历抽屉和网页版简历展开。</p></article>
            <article class="mature-feature tilt-card motion-card"><span>04</span><h3>Publish & Leads</h3><p>草稿保存、正式发布、公开访问、访客联系、线索进入收件箱。</p></article>
          </div>
        </section>

        <section class="section operating-section" data-reveal>
          <div class="operating-card tilt-card motion-card">
            <div>
              <p class="section-kicker">Operating Model</p>
              <h2>一开始就按成熟 SaaS 的方式留接口。</h2>
              <p>当前仍是轻量前端 MVP，但代码结构已经接入国内可访问的 CloudBase 数据层：用户资料、模板、发布版本、线索与静态托管可以逐步扩展。</p>
            </div>
            <div class="ops-list">
              <div><b>草稿版</b><span>用户编辑中，不影响公开页</span></div>
              <div><b>发布版</b><span>访客只看到正式发布内容</span></div>
              <div><b>字段权限</b><span>年龄、手机、微信、薪资等默认可隐藏</span></div>
              <div><b>模板令牌</b><span>一套数据渲染不同风格</span></div>
            </div>
          </div>
        </section>

        <section class="section" data-reveal>
          <div class="section-head">
            <div><p class="section-kicker">Use Cases</p><h2>先服务三类高意愿用户。</h2></div>
            <a class="btn ghost magnetic" href="#/templates">查看模板</a>
          </div>
          <div class="usecase-grid">
            <article class="usecase-card tilt-card motion-card"><b>求职 / 转型</b><h3>从 PDF 简历升级到证据主页。</h3><p>突出学历、工作经历、项目案例、期望岗位和可下载简历。</p></article>
            <article class="usecase-card tilt-card motion-card"><b>自由职业 / 合作</b><h3>把能力展示变成合作入口。</h3><p>突出服务范围、案例、社媒、作品链接和联系表单。</p></article>
            <article class="usecase-card tilt-card motion-card"><b>创作者 / Builder</b><h3>展示持续构建的过程。</h3><p>突出公开记录、内容观点、项目进度和数字资产中心。</p></article>
          </div>
        </section>

        <section class="section" data-reveal>
          <div class="section-head">
            <div><p class="section-kicker">Templates</p><h2>风格统一，模板只是表达语气。</h2></div>
            <a class="btn ghost magnetic" href="#/templates">打开模板库</a>
          </div>
          <div class="template-grid">
            ${db.templates.map((t) => templateCard(t, row.templateId)).join('')}
          </div>
        </section>
      </main>
    `, { mode: 'marketing' });
  }

  function dashboardPage() {
    const db = loadDB();
    const row = currentProfile(db);
    const p = ensure(row);
    const progress = Math.min(100, Math.round((p.progress.current / p.progress.total) * 100));
    const leadsCount = db.leads.filter((l) => l.profileId === row.id).length;
    const viewsCount = (db.views || []).filter((v) => v.profileId === row.id).length;
    const health = Math.min(100, 44 + p.projects.length * 6 + p.assets.length * 3 + (p.resume.summary ? 8 : 0) + (p.contact.note ? 6 : 0));
    const tasks = [
      ['完善个人身份', !!p.identity.title, '#/studio/identity'],
      ['补充 3 个精选项目', p.projects.length >= 3, '#/studio/projects'],
      ['整理社交/IP 入口', p.assets.length >= 2, '#/studio/assets'],
      ['填写工作/履历', !!p.resume.summary && p.resume.education.length, '#/studio/resume'],
      ['设置隐私可见性', !!p.visibility, '#/studio/visibility'],
      ['发布公开页', !!row.publishedAt, '#/studio/contact'],
    ];
    return shell(`
      <main class="page dashboard-page">
        <section class="dashboard-hero mature-dashboard-hero" data-reveal>
          <div>
            <p class="eyebrow">Workspace</p>
            <h1>产品级主页工作台。</h1>
            <p>这里不是传统后台，而是一个个人能力产品的运营台：检查主页健康度、继续编辑资料、发布正式版本、查看访客线索。</p>
            <div class="actions"><a class="btn primary magnetic" href="#/studio/identity">继续编辑</a><button class="btn ghost magnetic" data-action="publish" type="button">发布草稿</button><a class="btn ghost magnetic" href="#/u/${esc(row.handle)}">查看公开页</a></div>
          </div>
          <aside class="dashboard-panel product-health tilt-card motion-card">
            <span class="pill">Profile Health</span>
            <h2>${health}%</h2>
            <p class="muted">完成度越高，公开页越像一个可信产品资产。</p>
            <div class="health-bar"><span style="width:${health}%"></span></div>
            <div class="mini-kpis"><span>项目 ${p.projects.length}</span><span>访问 ${viewsCount}</span><span>线索 ${leadsCount}</span></div>
          </aside>
        </section>
        <section class="dashboard-grid product-dashboard-grid" data-reveal>
          <article class="dash-card tilt-card motion-card link-card"><span class="pill">Share Links</span><div><strong>${esc(row.handle)}</strong><p>公开主页：${esc(publicUrl(row))}</p><p>网页版简历：${esc(resumeUrl(row))}</p></div><div class="inline-actions"><button class="btn tiny" data-action="copy-public-url">复制主页</button><button class="btn tiny" data-action="copy-resume-url">复制简历</button></div></article>
          <article class="dash-card tilt-card motion-card"><span class="pill">Build Log</span><div><strong>${esc(p.progress.current)} / ${esc(p.progress.total)}</strong><p>${esc(p.progress.label)}公开记录</p></div><a class="btn tiny" href="#/studio/hero">编辑记录</a></article>
          <article class="dash-card tilt-card motion-card"><span class="pill">Views</span><div><strong>${viewsCount}</strong><p>公开页访问记录</p></div><a class="btn tiny" href="#/u/${esc(row.handle)}">查看公开页</a></article>
          <article class="dash-card tilt-card motion-card"><span class="pill">Leads</span><div><strong>${leadsCount}</strong><p>访客联系线索</p></div><a class="btn tiny" href="#/inbox">查看收件箱</a></article>
        </section>
        <section class="section tight dashboard-operate" data-reveal>
          <article class="onboarding-panel tilt-card motion-card">
            <div><p class="section-kicker">Launch Checklist</p><h2>上线前检查。</h2><p class="muted">成熟产品感来自流程：每次发布前都知道自己还缺什么。</p></div>
            <div class="task-list">${tasks.map(([label, done, href]) => `<a href="${href}" class="task-row ${done ? 'done' : ''}"><span>${done ? '✓' : '•'}</span><b>${esc(label)}</b><small>${done ? '已完成' : '待完善'}</small></a>`).join('')}</div>
          </article>
          <article class="release-panel tilt-card motion-card">
            <p class="section-kicker">Release State</p>
            <h2>草稿与公开页分离。</h2>
            <p class="muted">编辑器中的内容会自动保存为草稿，点击发布才会进入公开页。后续接真实数据库时，这里可以扩展版本历史、审核和回滚。</p>
            <div class="release-grid"><div><b>${esc(row.templateId)}</b><span>当前模板</span></div><div><b>${progress}%</b><span>能力记录</span></div><div><b>${row.publishedAt ? '已发布' : '草稿'}</b><span>公开状态</span></div></div>
          </article>
        </section>
        <section class="section tight" data-reveal>
          <div class="section-head"><div><p class="section-kicker">Quick Operations</p><h2>继续完善核心模块。</h2></div></div>
          <div class="quick-grid">
            ${sections.map((s) => `<a class="quick-card tilt-card motion-card" href="#/studio/${s[0]}"><b>${s[1]}</b><span>${s[2]}</span></a>`).join('')}
          </div>
        </section>
      </main>
    `);
  }

  function studioPage(active = 'identity') {
    const row = currentProfile(loadDB());
    const p = ensure(row);
    return shell(`
      <main class="page studio-page mature-studio-page">
        <section class="studio-hero mature-studio-hero" data-reveal>
          <div>
            <p class="eyebrow">Profile Studio</p>
            <h1>编辑个人主页，就像运营一个产品。</h1>
            <p>左边切换资料对象，中间编辑内容，右边实时预览。自动保存为草稿，发布后才更新公开页，适合未来接数据库、版本历史和团队协作。</p>
          </div>
          <div class="studio-toolbar"><button class="btn primary magnetic" type="button" data-action="publish">发布草稿</button><a class="btn ghost magnetic" href="#/u/${esc(row.handle)}">查看公开页</a><button class="btn ghost magnetic" type="button" data-action="open-command">⌘K</button></div>
        </section>
        <section class="studio-layout mature-studio-layout" data-reveal>
          <aside class="studio-sidebar">
            ${sections.map(([id, label, desc]) => `<a class="studio-tab ${active === id ? 'active' : ''}" href="#/studio/${id}"><strong>${label}</strong><span>${desc}</span></a>`).join('')}
          </aside>
          <div class="editor-stack">${editorContent(active, p, row)}</div>
          <aside class="preview-sticky">
            <div class="live-preview tilt-card motion-card" data-studio-preview>${studioPreview(p, row)}</div>
            <div class="publish-card"><b>发布控制</b><p>当前编辑的是 draft，公开页读取 published。可直接把公开主页或网页版简历链接发给别人阅读。</p><button class="btn light tiny magnetic" data-action="publish" type="button">发布到公开页</button><button class="btn light tiny magnetic" data-action="copy-public-url" type="button">复制主页链接</button><button class="btn light tiny magnetic" data-action="copy-resume-url" type="button">复制简历链接</button></div>
          </aside>
        </section>
      </main>
    `);
  }

  function editorContent(active, p, row) {
    if (active === 'identity') return editorCard('个人身份', `
      <div class="form-grid">
        ${inputField('姓名 / 昵称', 'identity.name', p.identity.name)}
        ${inputField('主页 handle', 'identity.handle', p.identity.handle)}
        ${inputField('身份定位', 'identity.title', p.identity.title)}
        ${inputField('头像文字', 'identity.avatar', p.identity.avatar)}
        ${inputField('头像图片 URL', 'identity.avatarUrl', p.identity.avatarUrl, { type: 'url' })}
        ${inputField('所在城市', 'identity.city', p.identity.city)}
        ${inputField('开放状态', 'identity.status', p.identity.status)}
        ${inputField('个人域名', 'identity.website', p.identity.website)}
        ${inputField('邮箱', 'identity.email', p.identity.email, { type: 'email' })}
        ${inputField('手机号', 'identity.phone', p.identity.phone)}
        ${inputField('微信号', 'identity.wechat', p.identity.wechat)}
        ${inputField('年龄', 'identity.age', p.identity.age)}
        ${inputField('性别', 'identity.gender', p.identity.gender)}
        ${inputField('居住地', 'identity.residence', p.identity.residence)}
        ${inputField('期望地点', 'identity.expectedLocation', p.identity.expectedLocation)}
        ${inputField('期望角色', 'identity.expectedRole', p.identity.expectedRole)}
        ${inputField('可开始时间', 'identity.availability', p.identity.availability)}
        ${inputField('期望薪资', 'identity.expectedSalary', p.identity.expectedSalary)}
        ${inputField('PDF 简历链接', 'identity.resumePdfUrl', p.identity.resumePdfUrl, { type: 'url' })}
      </div>
      <h3>主页文案</h3>
      <div class="form-grid">
        ${inputField('顶部小标签', 'hero.badge', p.hero.badge)}
        ${inputField('主按钮文案', 'hero.primaryCta', p.hero.primaryCta)}
        ${inputField('主标题', 'hero.headline', p.hero.headline, { wide: true })}
        ${inputField('介绍文案', 'hero.intro', p.hero.intro, { textarea: true, wide: true })}
      </div>`);

    if (active === 'visibility') return editorCard('字段可见性', `
      <p class="muted">建议默认公开姓名、定位、城市、期望角色；年龄、性别、手机号、微信、薪资默认隐藏或联系后可见。</p>
      <div class="visibility-grid">
        ${Object.keys(fieldLabels).map((key) => `<label class="visibility-row"><b>${esc(fieldLabels[key])}</b><select data-bind="visibility.${esc(key)}">${visibilityOptions.map(([value, label]) => `<option value="${value}" ${((p.visibility || {})[key] || 'public') === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`).join('')}
      </div>`);

    if (active === 'hero') return editorCard('首页文案与能力记录', `
      <div class="form-grid">
        ${inputField('顶部小标签', 'hero.badge', p.hero.badge)}
        ${inputField('主按钮文案', 'hero.primaryCta', p.hero.primaryCta)}
        ${inputField('主标题', 'hero.headline', p.hero.headline, { wide: true })}
        ${inputField('介绍文案', 'hero.intro', p.hero.intro, { textarea: true, wide: true })}
        ${inputField('记录名称', 'progress.label', p.progress.label)}
        ${inputField('当前天数', 'progress.current', p.progress.current, { kind: 'number', type: 'number' })}
        ${inputField('总目标', 'progress.total', p.progress.total, { kind: 'number', type: 'number' })}
      </div>
      <h3>能力记录</h3>
      ${listEditor('progress.records', p.progress.records, [
        ['day', '天数', 'number'], ['date', '日期'], ['title', '标题'], ['revenue', '新增'], ['expense', '消耗'], ['net', '净增'], ['note', '记录内容', 'textarea']
      ])}`);

    if (active === 'proof') return editorCard('能力证据', listEditor('proof', p.proof, [
      ['title', '标题'], ['desc', '说明', 'textarea'], ['tags', '标签，逗号分隔', 'tags']
    ]));

    if (active === 'projects') return editorCard('精选项目', `
      <h3>项目案例</h3>
      ${listEditor('projects', p.projects, [
        ['title', '项目标题'], ['summary', '项目摘要', 'textarea'], ['tags', '标签，逗号分隔', 'tags'], ['url', '项目链接', 'url'], ['coverUrl', '封面图片 URL', 'url']
      ])}
      <h3>能力证据</h3>
      ${listEditor('proof', p.proof, [
        ['title', '标题'], ['desc', '说明', 'textarea'], ['tags', '标签，逗号分隔', 'tags']
      ])}`);

    if (active === 'resume') return editorCard('完整简历档案', `
      <div class="form-grid one">
        ${inputField('简历摘要', 'resume.summary', p.resume.summary, { textarea: true })}
        ${inputField('核心技能，逗号分隔', 'resume.skills', p.resume.skills, { kind: 'tags' })}
        ${inputField('工具栈，逗号分隔', 'resume.stack', p.resume.stack, { kind: 'tags' })}
      </div>
      <h3>期望</h3>
      <div class="form-grid">
        ${inputField('期望角色', 'resume.expectations.roles', p.resume.expectations.roles)}
        ${inputField('期望城市', 'resume.expectations.cities', p.resume.expectations.cities)}
        ${inputField('合作类型', 'resume.expectations.type', p.resume.expectations.type)}
        ${inputField('开始时间', 'resume.expectations.startDate', p.resume.expectations.startDate)}
      </div>
      <h3>教育经历</h3>${listEditor('resume.education', p.resume.education, [['period','时间'],['school','学校'],['degree','学历'],['major','专业'],['city','城市'],['desc','说明','textarea']])}
      <h3>工作经历</h3>${listEditor('resume.work', p.resume.work, [['period','时间'],['company','公司 / 项目'],['role','职位'],['location','地点'],['desc','职责','textarea'],['result','结果','textarea']])}
      <h3>项目经历详情</h3>${listEditor('resume.projectExperiences', p.resume.projectExperiences, [['period','时间'],['title','项目'],['role','角色'],['desc','描述','textarea'],['result','结果','textarea'],['stack','技术栈，逗号分隔','tags']])}
      <h3>证书 / 奖项</h3>${listEditor('resume.certificates', p.resume.certificates, [['name','名称'],['issuer','颁发方'],['date','日期'],['url','链接']])}`);

    if (active === 'assets') return editorCard('社交/IP 聚合', listEditor('assets', p.assets, [
      ['type', '类型 github/blog/social/email/qr'], ['label', '名称'], ['value', '显示值'], ['url', '链接']
    ]));

    if (active === 'posts') return editorCard('作品资产', listEditor('posts', p.posts, [
      ['title', '标题'], ['meta', '类型 / 日期'], ['views', '浏览量'], ['url', '链接', 'url'], ['coverUrl', '封面图片 URL', 'url']
    ]));

    return editorCard('联系、发布与导出', `
      <div class="form-grid one">
        ${inputField('联系区说明', 'contact.note', p.contact.note, { textarea: true })}
        ${inputField('隐私提示', 'contact.privacyNote', p.contact.privacyNote, { textarea: true })}
        ${inputField('联系目的，逗号分隔', 'contact.intents', p.contact.intents, { kind: 'tags' })}
      </div>
      <div class="actions">
        <button class="btn primary magnetic" type="button" data-action="publish">发布草稿</button>
        <button class="btn ghost magnetic" type="button" data-action="copy-public-url">复制公开链接</button>
        <button class="btn ghost magnetic" type="button" data-action="export-json">导出 JSON</button>
        <button class="btn ghost magnetic" type="button" data-action="reset-demo">重置 Demo</button>
      </div>
      <p class="muted">当前公开地址：${esc(publicUrl(row))}</p>`);
  }

  function editorCard(title, body) {
    return `<article class="editor-card tilt-card motion-card"><h2>${esc(title)}</h2>${body}</article>`;
  }

  function inputField(label, path, value, opts = {}) {
    const cls = opts.wide ? 'field full' : 'field';
    const kind = opts.kind ? ` data-kind="${esc(opts.kind)}"` : '';
    const type = opts.type || 'text';
    const val = Array.isArray(value) ? value.join('，') : (value ?? '');
    const control = opts.textarea
      ? `<textarea data-bind="${esc(path)}"${kind}>${esc(val)}</textarea>`
      : `<input type="${esc(type)}" data-bind="${esc(path)}" value="${esc(val)}"${kind} />`;
    return `<label class="${cls}"><span>${esc(label)}</span>${control}</label>`;
  }

  function listEditor(path, list = [], fields = []) {
    const items = Array.isArray(list) ? list : [];
    return `<div class="list-editor">
      ${items.map((item, index) => `<article class="list-row">
        <div class="list-row-head">
          <b>${esc(item.title || item.name || item.label || `第 ${index + 1} 项`)}</b>
          <div class="list-actions">
            <button class="btn tiny icon" type="button" data-action="move-list" data-list="${esc(path)}" data-index="${index}" data-dir="-1" aria-label="上移" ${index === 0 ? 'disabled' : ''}>&uarr;</button>
            <button class="btn tiny icon" type="button" data-action="move-list" data-list="${esc(path)}" data-index="${index}" data-dir="1" aria-label="下移" ${index === items.length - 1 ? 'disabled' : ''}>&darr;</button>
            <button class="btn tiny" type="button" data-action="remove-list" data-list="${esc(path)}" data-index="${index}">删除</button>
          </div>
        </div>
        <div class="form-grid">
          ${fields.map(([key, label, kind]) => listInput(path, index, key, label, item[key], kind)).join('')}
        </div>
      </article>`).join('')}
      <button class="btn ghost magnetic" type="button" data-action="add-list" data-list="${esc(path)}">＋ 新增一项</button>
    </div>`;
  }

  function listInput(path, index, key, label, value, kind) {
    const val = Array.isArray(value) ? value.join('，') : (value ?? '');
    const kindAttr = kind ? ` data-kind="${esc(kind)}"` : '';
    const base = `data-list-field data-list="${esc(path)}" data-index="${index}" data-field="${esc(key)}"${kindAttr}`;
    if (kind === 'textarea') return `<label class="field full"><span>${esc(label)}</span><textarea ${base}>${esc(val)}</textarea></label>`;
    const type = kind === 'number' ? 'number' : kind === 'url' ? 'url' : 'text';
    return `<label class="field"><span>${esc(label)}</span><input type="${type}" ${base} value="${esc(val)}" /></label>`;
  }

  function studioPreview(p, row) {
    return `<div class="live-screen">
      <div class="browser-mini"><i></i><i></i><i></i><span>/u/${esc(row.handle)}</span></div>
      ${avatarNode(p)}
      <h3>${esc(p.hero.headline)}</h3>
      <p class="muted">${esc(p.identity.title)}</p>
      <div class="live-line"><span style="width:${Math.min(100, Math.round((p.progress.current / p.progress.total) * 100))}%"></span></div>
      <div class="profile-stats">
        ${p.metrics.map((m) => `<div class="profile-stat"><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join('')}
      </div>
      <div class="live-projects">
        ${p.projects.slice(0,3).map((x) => `<div><b>${esc(x.title)}</b><small>${esc(x.summary)}</small></div>`).join('')}
      </div>
    </div>`;
  }

  function templatesPage() {
    const db = loadDB();
    const row = currentProfile(db);
    return shell(`
      <main class="page">
        <section class="simple-hero mature-simple-hero" data-reveal>
          <p class="eyebrow">Template System</p>
          <h1>模板不是换皮，而是不同场景的表达策略。</h1>
          <p>一套资料数据可以渲染成求职主页、合作主页或创作者主页。成熟产品应该让用户选择目标，而不是只选择颜色。</p>
        </section>
        <section class="template-grid" data-reveal>${db.templates.map((t) => templateCard(t, row.templateId)).join('')}</section>
        <section class="section tight" data-reveal>
          <div class="template-system-panel tilt-card motion-card">
            <div><p class="section-kicker">System Design</p><h2>统一组件，稳定扩展。</h2></div>
            <div class="ops-list">
              <div><b>同一套数据</b><span>身份、项目、简历、资产、线索统一管理</span></div>
              <div><b>多种模板</b><span>模板只改变呈现语气，不改变信息结构</span></div>
              <div><b>可控发布</b><span>用户选择字段是否公开、详情展示或联系后可见</span></div>
            </div>
          </div>
        </section>
      </main>`);
  }

  function pricingPage() {
    return shell(`
      <main class="page pricing-page">
        <section class="simple-hero mature-simple-hero" data-reveal>
          <p class="eyebrow">Pricing Draft</p>
          <h1>从第一天就按商业化产品规划。</h1>
          <p>当前代码包仍是免费静态 MVP，但产品结构已经为自定义域名、高级模板、AI 文案、访问数据和线索管理预留了商业化路径。</p>
        </section>
        <section class="pricing-grid" data-reveal>
          <article class="price-card tilt-card motion-card"><span class="pill">Free</span><h2>个人起步</h2><p>1 个公开主页、基础模板、Profile Studio、本地数据导出。</p><b>¥0</b><a class="btn ghost magnetic" href="#/studio/identity">开始创建</a></article>
          <article class="price-card featured tilt-card motion-card"><span class="pill">Pro</span><h2>求职 / 合作</h2><p>自定义域名、高级模板、去角标、访问数据、线索收件箱。</p><b>¥29/月</b><a class="btn primary magnetic" href="#/dashboard">升级路线</a></article>
          <article class="price-card tilt-card motion-card"><span class="pill">Team</span><h2>社群 / 学校</h2><p>批量创建成员主页、模板统一、线索汇总、组织主页。</p><b>联系沟通</b><a class="btn ghost magnetic" href="#/inbox">查看线索</a></article>
        </section>
      </main>`);
  }

  function templateCard(t, selectedId) {
    const cls = t.id === 'craft-dark' ? 'dark' : t.id === 'build-story' ? 'story' : '';
    return `<article class="template-card tilt-card motion-card">
      <div>
        <div class="template-preview ${cls}">
          <span class="template-line"></span><span class="template-line short"></span><span class="template-line"></span>
          <div class="preview-metrics"><div class="metric"><strong>6</strong><span>记录</span></div><div class="metric"><strong>12</strong><span>项目</span></div><div class="metric"><strong>68</strong><span>内容</span></div></div>
        </div>
        <h3>${esc(t.name)}</h3>
        <span class="pill" style="color:${esc(t.accent)}">${esc(t.tone)}</span>
        <p>${esc(t.desc)}</p>
      </div>
      <button class="btn ${selectedId === t.id ? 'primary' : 'ghost'} magnetic" type="button" data-action="select-template" data-template-id="${esc(t.id)}">${selectedId === t.id ? '正在使用' : '使用模板'}</button>
    </article>`;
  }

  function publicPage(handle) {
    const row = profileByHandle(handle);
    trackVisit(row, 'public_profile');
    const p = row.published || row.draft;
    const record = (p.progress.records || [])[recordIndex % Math.max((p.progress.records || []).length, 1)] || {};
    const progress = Math.min(100, Math.round((p.progress.current / p.progress.total) * 100));
    return shell(`
      <main class="public-page template-${esc(row.templateId)}">
        <section class="public-hero" data-reveal>
          <div class="public-copy">
            <p class="eyebrow">${esc(p.hero.badge)}</p>
            <h1 class="public-title">${headline(p.hero.headline)}</h1>
            <p class="lede">${esc(p.hero.intro)}</p>
            <div class="public-meta">
              ${canShow(p,'city') ? `<span class="pill">${esc(p.identity.city)}</span>` : ''}
              ${canShow(p,'status') ? `<span class="pill">${esc(p.identity.status)}</span>` : ''}
              ${canShow(p,'expectedRole') ? `<span class="pill">期望：${esc(p.identity.expectedRole)}</span>` : ''}
              ${canShow(p,'availability') ? `<span class="pill">${esc(p.identity.availability)}</span>` : ''}
            </div>
            <div class="public-actions">
              <button class="btn primary magnetic" type="button" data-action="scroll-to" data-target="proof">${esc(p.hero.primaryCta)}</button>
              <button class="btn ghost magnetic" type="button" data-action="open-resume">查看完整简历</button>
              <a class="btn ghost magnetic" href="#/resume/${esc(row.handle)}">网页版简历</a>
            </div>
          </div>
          <aside class="public-orbit tilt-card motion-card">
            <article class="profile-card">
              ${avatarNode(p)}
              <h2>${canShow(p,'name') ? esc(p.identity.name) : '个人主页'}</h2>
              <p>${canShow(p,'title') ? esc(p.identity.title) : '身份信息未公开'}</p>
              <div class="profile-stats">${p.metrics.map((m) => `<div class="profile-stat"><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join('')}</div>
            </article>
            <article class="record-card">
              <div class="record-head"><div><small>${esc(p.progress.label)}</small><h3>${esc(p.progress.current)} / ${esc(p.progress.total)}</h3></div><span class="pill">Live</span></div>
              <div class="record-bar" style="--progress:${progress}%"><span></span></div>
              <b>${esc(record.title || '暂无记录')}</b>
              <p>${esc(record.date || '')}</p>
              <div class="record-grid"><div><span>新增</span><b>${esc(record.revenue || '+0')}</b></div><div><span>消耗</span><b>${esc(record.expense || '-0')}</b></div><div><span>净增</span><b>${esc(record.net || '0')}</b></div></div>
              <p>${esc(record.note || '')}</p>
              <div class="record-nav"><button class="btn tiny dark" type="button" data-action="record-prev">‹ Prev</button><button class="btn tiny light" type="button" data-action="record-next">Next ›</button></div>
            </article>
          </aside>
        </section>

        <section id="proof" class="public-section" data-reveal>
          <div class="section-head"><div><p class="section-kicker">Job Fit</p><h2>岗位匹配证据。</h2></div><p>首页展示最能帮别人快速判断你的能力证据；完整学历、工作、项目经历放进简历抽屉。</p></div>
          <div class="proof-grid">${p.proof.map((x, i) => `<article class="proof-card tilt-card motion-card"><div><span class="proof-icon">0${i+1}</span><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></div><div>${(x.tags||[]).map(tag).join('')}</div></article>`).join('')}</div>
        </section>

        <section class="public-section dark-band" data-reveal>
          <div class="dark-inner">
            <div><p class="eyebrow">Why me</p><h2>${esc(p.story.title)}</h2><p>${esc(p.story.body)}</p><div>${p.resume.skills.slice(0,8).map(tag).join('')}</div></div>
            <div class="dark-media-grid">
              <article class="media-tile tilt-card"><b>${esc(p.projects[0]?.title || '项目案例')}</b><span>${esc(p.projects[0]?.summary || '')}</span></article>
              <article class="media-tile tilt-card"><b>数字资产</b><span>${p.assets.length} 个公开入口</span></article>
              <article class="media-tile tilt-card"><b>内容观点</b><span>${p.posts.length} 条内容线索</span></article>
            </div>
          </div>
        </section>

        <section class="public-section" data-reveal>
          <div class="section-head"><div><p class="section-kicker">Case Studies</p><h2>项目案例。</h2></div></div>
          <div class="project-grid">${p.projects.map((x, i) => projectCard(x, i)).join('')}</div>
        </section>

        <section class="public-section resume-module" data-reveal>
          <div class="resume-overview">
            <div class="resume-title-card tilt-card motion-card">
              <div><p class="section-kicker">Resume</p><h2>简历<br>摘要</h2></div>
              <p>首页只展示摘要和关键判断信息，完整学历、专业、工作与项目经历放入简历抽屉，避免页面被传统表格破坏。</p>
              <div class="resume-actions"><button class="btn primary magnetic" type="button" data-action="open-resume">查看完整简历</button><a class="btn ghost magnetic" href="#/resume/${esc(row.handle)}">网页版简历</a>${mediaUrl(p.identity.resumePdfUrl, 'file') && canShow(p,'resumePdf','public') ? `<a class="btn ghost magnetic" href="${esc(mediaUrl(p.identity.resumePdfUrl, 'file'))}" target="_blank" rel="noopener">下载 PDF</a>` : ''}</div>
            </div>
            <div>
              <div class="resume-detail-grid">
                <article class="resume-block tilt-card motion-card"><h3>摘要</h3><p>${esc(p.resume.summary)}</p><div>${p.resume.skills.slice(0,8).map(tag).join('')}</div></article>
                <article class="resume-block tilt-card motion-card"><h3>期望</h3><p>角色：${visibleValue(p,'expectedRole',p.resume.expectations.roles)}</p><p>地点：${visibleValue(p,'expectedLocation',p.resume.expectations.cities)}</p><p>方式：${esc(p.resume.expectations.type)}</p><p>开始：${visibleValue(p,'availability',p.resume.expectations.startDate)}</p></article>
                <article class="resume-block tilt-card motion-card"><h3>教育</h3><p>${canShow(p,'education','public') ? esc((p.resume.education[0]||{}).school || '') + ' · ' + esc((p.resume.education[0]||{}).major || '') : '教育背景在完整简历中展示。'}</p></article>
                <article class="resume-block tilt-card motion-card"><h3>经历</h3><p>${canShow(p,'work','public') ? esc((p.resume.work[0]||{}).company || '') + ' · ' + esc((p.resume.work[0]||{}).role || '') : '工作经历在简历抽屉中展开。'}</p></article>
              </div>
              <div class="resume-strip">
                <article class="resume-block"><h3>技能栈</h3><p>${esc(p.resume.stack.join(' · '))}</p></article>
                <article class="resume-block"><h3>隐私控制</h3><p>${esc(p.contact.privacyNote)}</p></article>
                <article class="resume-block"><h3>PDF</h3><p>${canShow(p,'resumePdf','public') ? (mediaUrl(p.identity.resumePdfUrl, 'file') ? '已配置 PDF 简历链接。' : '支持替换为真实 PDF 链接。') : 'PDF 可设置为联系后可见。'}</p></article>
              </div>
            </div>
          </div>
        </section>

        <section class="public-section" data-reveal>
          <div class="section-head"><div><p class="section-kicker">Digital Assets</p><h2>数字资产中心。</h2></div></div>
          <div class="asset-grid">${p.assets.map((x) => `<a class="asset-card tilt-card motion-card" href="${esc(x.url || '#')}"><span class="asset-icon">${esc(assetIcon(x.type))}</span><div><b>${esc(x.label)}</b><span>${esc(x.value)}</span></div></a>`).join('')}</div>
        </section>

        <section class="public-section" data-reveal>
          <div class="section-head"><div><p class="section-kicker">Blog & Insights</p><h2>内容与观点。</h2></div></div>
          <div class="post-list">${p.posts.map(postCard).join('')}</div>
        </section>

        <section id="contact" class="public-section contact-grid" data-reveal>
          <article class="contact-card tilt-card motion-card"><p class="section-kicker">Contact</p><h2>面试 / 合作入口。</h2><p>${esc(p.contact.note)}</p><p>${visibleValue(p,'email',p.identity.email,'public')}</p></article>
          <article class="contact-card">
            <form class="contact-form" data-contact-form data-profile-id="${esc(row.id)}" data-profile-handle="${esc(row.handle)}">
              <label class="field"><span>你的名字</span><input name="name" maxlength="80" autocomplete="name" required /></label>
              <label class="field"><span>邮箱</span><input name="email" type="email" maxlength="160" autocomplete="email" required /></label>
              <label class="field full"><span>联系目的</span><select name="intent" required>${p.contact.intents.map((x) => `<option>${esc(x)}</option>`).join('')}</select></label>
              <label class="field full"><span>留言</span><textarea name="message" maxlength="1200" required placeholder="请简要描述机会、合作或想查看的信息..."></textarea></label>
              <button class="btn primary magnetic full" type="submit">发送消息</button>
            </form>
          </article>
        </section>
      </main>
      ${resumeDrawer(p, row)}
    `, { mode: 'reader', profileRow: row, profile: p });
  }

  function headline(text) {
    const safe = esc(text || '');
    const idx = Math.max(safe.indexOf('可'), Math.floor(safe.length * .45));
    return `${safe.slice(0, idx)}<span class="mark">${safe.slice(idx)}</span>`;
  }

  function projectCard(x, i) {
    const cover = mediaUrl(x.coverUrl);
    return `<article class="project-card tilt-card motion-card"><div class="project-cover ${cover ? 'has-image' : ''}">${cover ? `<img src="${esc(cover)}" alt="${esc(x.title)}" loading="lazy" />` : ''}<span>0${i+1} · ${esc(x.title)}</span></div><h3>${esc(x.title)}</h3><p>${esc(x.summary)}</p><div>${(x.tags||[]).map(tag).join('')}</div><a class="btn tiny ghost magnetic" href="${esc(x.url || '#')}">查看详情</a></article>`;
  }

  function postCard(x) {
    const cover = mediaUrl(x.coverUrl);
    return `<a class="post-card tilt-card motion-card" href="${esc(x.url || '#')}"><span class="post-thumb ${cover ? 'has-image' : ''}">${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" />` : ''}</span><div><h3>${esc(x.title)}</h3><p>${esc(x.meta)}</p></div><span class="pill">${esc(x.views)}</span></a>`;
  }

  function resumeDrawer(p, row) {
    const edu = canShow(p, 'education', 'details') ? p.resume.education : [];
    const work = canShow(p, 'work', 'details') ? p.resume.work : [];
    const projects = canShow(p, 'projectExperiences', 'details') ? p.resume.projectExperiences : [];
    const certs = canShow(p, 'certificates', 'details') ? p.resume.certificates : [];
    return `<aside class="resume-drawer" id="resumeDrawer" aria-hidden="true">
      <div class="drawer-backdrop" data-action="close-resume"></div>
      <section class="drawer-panel" role="dialog" aria-modal="true" aria-label="完整简历">
        <div class="drawer-top"><div><p class="eyebrow">Full Resume</p><h2>${esc(p.identity.name)}</h2><p class="muted">${esc(p.identity.title)}</p></div><button class="btn tiny" type="button" data-action="close-resume">关闭</button></div>
        <section class="drawer-section"><h3>基本资料</h3><div class="drawer-list">
          <article class="drawer-item"><b>所在地 / 期望</b><p>${visibleValue(p,'residence',p.identity.residence,'details')} · ${visibleValue(p,'expectedLocation',p.identity.expectedLocation,'details')}</p></article>
          <article class="drawer-item"><b>联系方式</b><p>邮箱：${visibleValue(p,'email',p.identity.email,'details')} · 手机：${visibleValue(p,'phone',p.identity.phone,'details')} · 微信：${visibleValue(p,'wechat',p.identity.wechat,'details')}</p></article>
          <article class="drawer-item"><b>隐私字段</b><p>年龄：${visibleValue(p,'age',p.identity.age,'details')} · 性别：${visibleValue(p,'gender',p.identity.gender,'details')} · 薪资：${visibleValue(p,'expectedSalary',p.identity.expectedSalary,'details')}</p></article>
        </div></section>
        ${drawerList('教育背景', edu, (x) => `<b>${esc(x.school)} · ${esc(x.degree)}</b><span>${esc(x.period)} · ${esc(x.city)}</span><p>${esc(x.major)}</p><small>${esc(x.desc)}</small>`)}
        ${drawerList('工作经历', work, (x) => `<b>${esc(x.company)} · ${esc(x.role)}</b><span>${esc(x.period)} · ${esc(x.location)}</span><p>${esc(x.desc)}</p><small>${esc(x.result)}</small>`)}
        ${drawerList('项目经历', projects, (x) => `<b>${esc(x.title)} · ${esc(x.role)}</b><span>${esc(x.period)}</span><p>${esc(x.desc)}</p><small>${esc(x.result)}</small><div>${(x.stack||[]).map(tag).join('')}</div>`)}
        ${drawerList('证书 / 奖项', certs, (x) => `<b>${esc(x.name)}</b><span>${esc(x.issuer)} · ${esc(x.date)}</span>`)}
        <section class="drawer-section"><h3>下一步</h3><div class="actions"><a class="btn primary magnetic" href="#/resume/${esc(row.handle)}">打开网页版简历</a><button class="btn ghost magnetic" data-action="scroll-to" data-target="contact" type="button">联系我</button></div></section>
      </section>
    </aside>`;
  }

  function drawerList(title, list, renderer) {
    return `<section class="drawer-section"><h3>${esc(title)}</h3><div class="drawer-list">${(list || []).length ? list.map((x) => `<article class="drawer-item">${renderer(x)}</article>`).join('') : `<article class="drawer-item"><p class="muted">这部分未公开，或设置为联系后可见。</p></article>`}</div></section>`;
  }

  function resumePrintPage(handle) {
    const row = profileByHandle(handle);
    const p = row.published || row.draft;
    return shell(`
      <main class="resume-print-page">
        <div class="print-actions actions"><button class="btn primary magnetic" type="button" data-action="print">打印 / 保存 PDF</button><a class="btn ghost magnetic" href="#/u/${esc(row.handle)}">返回公开页</a></div>
        <article class="print-sheet">
          <header class="print-head"><div><h1>${esc(p.identity.name)}</h1><p>${esc(p.identity.title)}</p></div><div><p>${esc(p.identity.city)}<br>${esc(p.identity.email)}<br>${esc(p.identity.website)}</p></div></header>
          <section class="print-section"><h2>摘要</h2><p>${esc(p.resume.summary)}</p><p>${esc(p.resume.skills.join(' · '))}</p></section>
          <section class="print-section"><h2>教育</h2>${p.resume.education.map((x) => `<div class="print-item"><b>${esc(x.school)} · ${esc(x.degree)}</b><span>${esc(x.period)} · ${esc(x.major)}</span><p>${esc(x.desc)}</p></div>`).join('')}</section>
          <section class="print-section"><h2>工作经历</h2>${p.resume.work.map((x) => `<div class="print-item"><b>${esc(x.company)} · ${esc(x.role)}</b><span>${esc(x.period)} · ${esc(x.location)}</span><p>${esc(x.desc)}</p><p>${esc(x.result)}</p></div>`).join('')}</section>
          <section class="print-section"><h2>项目经历</h2>${p.resume.projectExperiences.map((x) => `<div class="print-item"><b>${esc(x.title)} · ${esc(x.role)}</b><span>${esc(x.period)} · ${(x.stack||[]).join(' · ')}</span><p>${esc(x.desc)}</p><p>${esc(x.result)}</p></div>`).join('')}</section>
        </article>
      </main>`, { noHeader: true, noFooter: true });
  }

  function currentLeads(db = loadDB()) {
    const row = currentProfile(db);
    return db.leads.filter((l) => l.profileId === row.id).slice().reverse();
  }

  function leadStatusLabel(status) {
    return { new: '新线索', contacted: '已联系', archived: '已归档' }[status] || '新线索';
  }

  function inboxPage() {
    const db = loadDB();
    const leads = currentLeads(db);
    return shell(`
      <main class="page">
        <section class="simple-hero" data-reveal><p class="eyebrow">Inbox</p><h1>联系线索收件箱。</h1><p>访客提交的面试、合作、请求联系方式都会进入这里。</p><div class="actions"><button class="btn ghost magnetic" type="button" data-action="export-leads" ${leads.length ? '' : 'disabled'}>导出 CSV</button></div></section>
        <section class="lead-list" data-reveal>
          ${leads.length ? leads.map((l) => `
            <article class="lead-card tilt-card motion-card">
              <div>
                <span>${esc(l.intent)} · ${esc(leadStatusLabel(l.status))}</span>
                <h3>${esc(l.name)}</h3>
                <p>${esc(l.email)}<br>${new Date(l.createdAt).toLocaleString()}</p>
                <div class="lead-actions">
                  <button class="btn tiny" type="button" data-action="lead-status" data-lead-id="${esc(l.id)}" data-status="new" ${(l.status || 'new') === 'new' ? 'disabled' : ''}>新线索</button>
                  <button class="btn tiny" type="button" data-action="lead-status" data-lead-id="${esc(l.id)}" data-status="contacted" ${l.status === 'contacted' ? 'disabled' : ''}>已联系</button>
                  <button class="btn tiny" type="button" data-action="lead-status" data-lead-id="${esc(l.id)}" data-status="archived" ${l.status === 'archived' ? 'disabled' : ''}>归档</button>
                </div>
              </div>
              <div class="lead-detail">
                <p>${esc(l.message)}</p>
                <label class="lead-note field full"><span>跟进备注</span><textarea data-lead-note maxlength="500" placeholder="记录下次跟进、报价、面试进度">${esc(l.note || '')}</textarea></label>
                <button class="btn tiny" type="button" data-action="lead-note" data-lead-id="${esc(l.id)}">保存备注</button>
              </div>
            </article>`).join('') : '<article class="lead-card"><h3>暂无线索</h3><p>公开页联系表单提交后会出现在这里。</p></article>'}
        </section>
      </main>`);
  }

  function termsPage() {
    return shell(`
      <main class="page">
        <section class="simple-hero" data-reveal>
          <p class="eyebrow">Terms</p>
          <h1>用户协议。</h1>
          <p>使用个人能力 OS 即表示你同意用真实、合法、可公开分享的资料创建个人主页，并自行负责发布内容的准确性和授权。</p>
        </section>
        <section class="feature-grid" data-reveal>
          <article class="feature-card"><span>01</span><h3>账号</h3><p>你需要保护自己的登录信息。发现异常使用时，请尽快退出登录并联系我们处理。</p></article>
          <article class="feature-card"><span>02</span><h3>内容</h3><p>你发布的主页、简历、项目和联系方式由你维护。不要上传侵权、违法、误导或不适合公开传播的内容。</p></article>
          <article class="feature-card"><span>03</span><h3>服务</h3><p>当前产品处于 MVP 阶段，可能继续调整模板、字段和发布体验。重要资料建议自行保留备份。</p></article>
        </section>
      </main>`);
  }

  function privacyPage() {
    return shell(`
      <main class="page">
        <section class="simple-hero" data-reveal>
          <p class="eyebrow">Privacy</p>
          <h1>隐私说明。</h1>
          <p>我们只收集运行个人主页所需的信息：账号邮箱、Profile 草稿、发布后的公开资料，以及访客主动提交的联系线索。</p>
        </section>
        <section class="feature-grid" data-reveal>
          <article class="feature-card"><span>01</span><h3>草稿</h3><p>草稿资料只供登录用户自己编辑查看，依赖 CloudBase 登录与数据库权限控制。</p></article>
          <article class="feature-card"><span>02</span><h3>公开页</h3><p>点击发布后，公开主页和网页版简历会对访问链接的人可见。字段可见性由你在 Studio 中控制。</p></article>
          <article class="feature-card"><span>03</span><h3>线索</h3><p>访客提交的姓名、邮箱和留言只展示给主页拥有者，用于求职、合作或进一步沟通。</p></article>
        </section>
      </main>`);
  }

  function loginPage(mode = routePath()) {
    const demo = !runtime.useCloudBase;
    const isSignup = mode === 'signup';
    return `
      <main class="auth-page">
        <a class="auth-logo" href="#/home"><span class="brand-mark"></span><b>个人能力 OS</b><small>Productized</small></a>
        <section class="auth-shell" data-reveal>
          <div class="auth-copy">
            <p class="eyebrow">Account</p>
            <h1>${isSignup ? '注册后马上创建你的个人主页。' : '登录后继续编辑你的个人主页。'}</h1>
            <p>${isSignup ? '新账号会自动生成一个 Profile 草稿；你可以编辑资料、发布公开页，然后把链接发给面试官、合作方或朋友。' : '已注册用户可以回到工作台维护资料、发布公开页、查看联系线索。'}</p>
            <div class="auth-flow"><span>${isSignup ? '注册账号' : '登录账号'}</span><i></i><span>Profile Studio</span><i></i><span>发布公开页</span><i></i><span>/u/handle 直接分享</span></div>
          </div>
          <form class="login-card tilt-card motion-card" data-login-form data-auth-mode="${isSignup ? 'signup' : 'login'}">
            <p class="eyebrow">${isSignup ? 'Sign up' : 'Login'}</p>
            <h2>${isSignup ? '创建账号' : '进入 Profile Studio'}</h2>
            <p class="muted">${demo ? '本地 Demo 模式。' : (isSignup ? 'CloudBase Auth 注册。' : 'CloudBase Auth 登录。')}访客看公开页不需要账号。</p>
            <label class="field"><span>邮箱</span><input name="email" type="email" autocomplete="email" value="${demo ? 'demo@ability.local' : ''}" required /></label>
            <label class="field"><span>密码</span><input name="password" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" ${demo && !isSignup ? '' : 'minlength="8"'} value="${demo && !isSignup ? 'demo123' : ''}" required /></label>
            ${isSignup ? '<label class="field"><span>确认密码</span><input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required /></label><label class="check-line"><input name="agree" type="checkbox" required /><span>我同意 <a href="#/terms">用户协议</a> 和 <a href="#/privacy">隐私说明</a></span></label>' : ''}
            <button class="btn primary magnetic" type="submit">${isSignup ? '注册并进入工作台' : '登录'}</button>
            <div class="login-links"><a href="${isSignup ? '#/login' : '#/signup'}">${isSignup ? '已有账号，去登录' : '没有账号，去注册'}</a><a href="#/u/cj">查看公开示例</a></div>
          </form>
        </section>
      </main>`;
  }

  async function publishDraft() {
    if (publishing) return;
    publishing = true;
    document.querySelectorAll('[data-action="publish"]').forEach((button) => { button.disabled = true; });
    const db = loadDB();
    const row = currentProfile(db);
    const p = ensure(row);
    try {
      row.handle = (p.identity.handle || row.handle).replace(/[^a-z0-9-]/gi, '').toLowerCase() || row.handle;
      p.identity.handle = row.handle;
      row.published = clone(p);
      row.publishedAt = new Date().toISOString();
      row.updatedAt = new Date().toISOString();
      saveDB(db, { localOnly: runtime.useCloudBase });
      if (runtime.useCloudBase && api()) {
        clearTimeout(saveTimer);
        if (saveAbort) saveAbort.abort();
        saveSeq += 1;
        try {
          upsertProfile(await api().publishProfile(row), { current: true });
          saveDB(loadDB(), { localOnly: true });
        } catch (err) {
          console.warn(err);
          const message = String(err.message || '').toLowerCase();
          showToast(message.includes('duplicate') || message.includes('unique') ? '发布失败：handle 已被占用' : '发布失败，请检查 CloudBase 配置或权限');
          return;
        }
      }
      refreshPreview();
      showToast('已发布到公开页');
    } finally {
      publishing = false;
      document.querySelectorAll('[data-action="publish"]').forEach((button) => { button.disabled = false; });
    }
  }

  function formatInput(input) {
    const kind = input.dataset.kind;
    if (kind === 'number') return Number(input.value || 0);
    if (kind === 'tags') return asTags(input.value);
    return input.value;
  }

  function updateInput(input) {
    const db = loadDB();
    const row = currentProfile(db);
    const p = ensure(row);
    if (input.dataset.bind) {
      setPath(p, input.dataset.bind, formatInput(input));
      if (input.dataset.bind === 'identity.handle') row.handle = input.value.replace(/[^a-z0-9-]/gi, '').toLowerCase() || row.handle;
    }
    if (input.dataset.listField) {
      const list = getPath(p, input.dataset.list) || [];
      const item = list[Number(input.dataset.index)];
      if (item) item[input.dataset.field] = formatInput(input);
    }
    row.updatedAt = new Date().toISOString();
    saveDB(db);
    refreshPreview();
  }

  function refreshPreview() {
    const el = document.querySelector('[data-studio-preview]');
    if (!el) return;
    const row = currentProfile(loadDB());
    el.innerHTML = studioPreview(ensure(row), row);
  }

  function addList(path) {
    const db = loadDB();
    const row = currentProfile(db);
    const p = ensure(row);
    const list = getPath(p, path) || [];
    list.push(clone(emptyItem[path] || { title: '新项目' }));
    setPath(p, path, list);
    row.updatedAt = new Date().toISOString();
    saveDB(db);
    render(false);
    showToast('已新增一项');
  }

  function removeList(path, index) {
    const db = loadDB();
    const row = currentProfile(db);
    const p = ensure(row);
    const list = getPath(p, path) || [];
    list.splice(Number(index), 1);
    setPath(p, path, list);
    row.updatedAt = new Date().toISOString();
    saveDB(db);
    render(false);
    showToast('已删除');
  }

  function moveList(path, index, dir) {
    const db = loadDB();
    const row = currentProfile(db);
    const p = ensure(row);
    const list = getPath(p, path) || [];
    const from = Number(index);
    const to = from + Number(dir);
    if (!list[from] || to < 0 || to >= list.length) return;
    list.splice(to, 0, list.splice(from, 1)[0]);
    setPath(p, path, list);
    row.updatedAt = new Date().toISOString();
    saveDB(db);
    render(false);
    showToast('顺序已更新');
  }

  function copyPublicUrl() {
    const row = currentProfile(loadDB());
    if (navigator.clipboard) navigator.clipboard.writeText(publicUrl(row));
    showToast('公开主页链接已复制');
  }

  function copyResumeUrl() {
    const row = currentProfile(loadDB());
    if (navigator.clipboard) navigator.clipboard.writeText(resumeUrl(row));
    showToast('网页版简历链接已复制');
  }

  function selectTemplate(id) {
    const db = loadDB();
    const row = currentProfile(db);
    row.templateId = id;
    row.updatedAt = new Date().toISOString();
    saveDB(db);
    showToast('模板已切换');
    render(false);
  }

  function exportJSON() {
    const row = currentProfile(loadDB());
    const blob = new Blob([JSON.stringify(ensure(row), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${row.handle}-profile.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('已导出 JSON');
  }

  function csvCell(value) {
    const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  }

  function exportLeadsCSV() {
    const leads = currentLeads();
    if (!leads.length) {
      showToast('暂无线索可导出');
      return;
    }
    const row = currentProfile(loadDB());
    const header = ['name', 'email', 'intent', 'message', 'note', 'status', 'createdAt'];
    const lines = [
      header.map(csvCell).join(','),
      ...leads.map((lead) => header.map((key) => csvCell(key === 'createdAt' ? new Date(lead.createdAt).toISOString() : lead[key])).join(','))
    ];
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${row.handle}-leads.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('已导出 CSV');
  }

  async function updateLeadStatus(leadId, status) {
    if (!['new', 'contacted', 'archived'].includes(status)) return;
    const db = loadDB();
    const lead = db.leads.find((item) => item.id === leadId);
    if (!lead) return;
    const oldStatus = lead.status || 'new';
    lead.status = status;
    if (runtime.useCloudBase && api()) {
      try {
        await api().updateLeadStatus(leadId, status);
      } catch (err) {
        lead.status = oldStatus;
        console.warn(err);
        showToast('状态更新失败，请检查 leads 权限');
        render(false);
        return;
      }
    } else {
      saveDB(db);
    }
    showToast('线索状态已更新');
    render(false);
  }

  async function updateLeadNote(button) {
    const leadId = button.dataset.leadId;
    const input = button.closest('.lead-card')?.querySelector('[data-lead-note]');
    if (!input) return;
    const db = loadDB();
    const lead = db.leads.find((item) => item.id === leadId);
    if (!lead) return;
    const oldNote = lead.note || '';
    lead.note = String(input.value || '').trim().slice(0, 500);
    if (runtime.useCloudBase && api()) {
      try {
        await api().updateLeadNote(leadId, lead.note);
      } catch (err) {
        lead.note = oldNote;
        console.warn(err);
        showToast('备注保存失败，请检查 leads 权限');
        render(false);
        return;
      }
    } else {
      saveDB(db);
    }
    showToast('备注已保存');
    render(false);
  }

  function resetDemo() {
    if (runtime.useCloudBase) {
      showToast('CloudBase 模式下不会重置远程数据');
      return;
    }
    localStorage.removeItem(OS.STORAGE_KEY);
    runtime.db = loadLocalDB();
    showToast('已重置示例数据');
    setTimeout(() => render(false), 200);
  }

  async function login(form) {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const fd = new FormData(form);
    const mode = form.dataset.authMode || 'login';
    const email = String(fd.get('email') || '').trim();
    const password = String(fd.get('password') || '').trim();
    const confirmPassword = String(fd.get('confirmPassword') || '').trim();
    if (mode === 'signup' && password !== confirmPassword) {
      showToast('两次输入的密码不一致');
      return;
    }
    if (runtime.useCloudBase && api()) {
      try {
        if (mode === 'signup') await api().signUp(email, password);
        else await api().signIn(email, password);
        const user = await api().getUser();
        if (!user) {
          showToast('请先在邮箱中确认注册，再回来登录');
          return;
        }
        await loadRemoteWorkspace({ render: false });
        showToast(mode === 'signup' ? '注册成功，已进入工作台' : '已登录');
        navigate('dashboard');
      } catch (err) {
        console.warn(err);
        showToast(mode === 'signup' ? '注册失败：邮箱可能已注册或密码不符合要求' : '登录失败：账号不存在、密码错误或邮箱未确认');
      }
      return;
    }
    const db = loadDB();
    let user = db.users.find((u) => u.email === email);
    if (user && mode === 'signup') {
      showToast('邮箱已注册，请直接登录');
      return;
    }
    if (!user && mode === 'signup') {
      user = { id: `user_${Date.now()}`, name: email.split('@')[0], email, password, createdAt: new Date().toISOString() };
      db.users.push(user);
      const profile = clone(db.profiles[0]);
      profile.id = `profile_${Date.now()}`;
      profile.ownerId = user.id;
      profile.handle = email.split('@')[0].replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'new-user';
      profile.draft.identity.name = user.name;
      profile.draft.identity.email = email;
      profile.draft.identity.handle = profile.handle;
      profile.published = clone(profile.draft);
      db.profiles.push(profile);
    }
    if (!user) {
      showToast('账号不存在，请先注册');
      return;
    }
    if (user.password !== password) {
      showToast('密码不正确。Demo 账号密码是 demo123');
      return;
    }
    db.currentUserId = user.id;
    saveDB(db);
    showToast(mode === 'signup' ? '注册成功，已进入工作台' : '已登录');
    navigate('dashboard');
  }

  async function contact(form) {
    form.querySelectorAll('input[name="name"], input[name="email"], textarea[name="message"]').forEach((input) => {
      input.value = input.value.trim();
    });
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const fd = new FormData(form);
    const lead = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      intent: String(fd.get('intent') || '').trim(),
      message: String(fd.get('message') || '').trim()
    };
    if (runtime.useCloudBase && api()) {
      try {
        await api().createLead(routePath().split('/')[1] || form.dataset.profileHandle || 'cj', lead);
        form.reset();
        showToast('消息已发送，已进入线索收件箱');
      } catch (err) {
        console.warn(err);
        showToast('发送失败，请稍后重试');
      }
      return;
    }
    const db = loadDB();
    db.leads.push({
      id: `lead_${Date.now()}`,
      profileId: form.dataset.profileId,
      name: lead.name,
      email: lead.email,
      intent: lead.intent,
      message: lead.message,
      note: '',
      status: 'new',
      createdAt: new Date().toISOString()
    });
    saveDB(db);
    form.reset();
    showToast('消息已发送，已进入线索收件箱');
  }

  async function logout() {
    if (runtime.useCloudBase && api()) {
      try {
        await api().signOut();
      } catch (err) {
        console.warn(err);
      }
    }
    localStorage.removeItem(OS.STORAGE_KEY);
    runtime.db = loadLocalDB();
    runtime.useCloudBase = false;
    showToast('已退出');
    navigate('login');
  }

  function openResume() {
    const drawer = document.getElementById('resumeDrawer');
    if (!drawer) return;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('drawer-open');
  }

  function closeResume() {
    const drawer = document.getElementById('resumeDrawer');
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
  }

  function openCommand() {
    const row = currentProfile(loadDB());
    const commands = [
      ['平台首页', '#/home', '产品介绍'],
      ['工作台', '#/dashboard', '主页状态'],
      ...sections.map(([id, label, desc]) => [label, `#/studio/${id}`, desc]),
      ['模板库', '#/templates', '切换风格'],
      ['定价草案', '#/pricing', '商业化路径'],
      ['公开主页', `#/u/${row.handle}`, '查看效果'],
      ['线索收件箱', '#/inbox', '联系消息'],
    ];
    palette.innerHTML = `
      <div class="command-backdrop" data-action="close-command"></div>
      <div class="command-box">
        <div class="command-search"><span>⌘K</span><input placeholder="输入关键词或直接选择..." data-command-input autofocus /></div>
        <div class="command-list">${commands.map((c) => `<a href="${c[1]}" data-command-item><strong>${esc(c[0])}</strong><span>${esc(c[2])}</span></a>`).join('')}</div>
        <div class="command-actions"><button data-action="publish">发布草稿</button><button data-action="copy-public-url">复制公开链接</button><button data-action="copy-resume-url">复制简历链接</button><button data-action="export-json">导出 JSON</button></div>
      </div>`;
    palette.classList.add('open');
    setTimeout(() => palette.querySelector('input')?.focus(), 0);
  }

  function closeCommand() {
    palette.classList.remove('open');
  }

  function initReveal() {
    const items = [...document.querySelectorAll('[data-reveal]')];
    if (!items.length) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12 });
    items.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index * 40, 220)}ms`;
      observer.observe(item);
    });
  }

  function initMotion() {
    initReveal();
    const motionAllowed = window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!motionAllowed) return;

    document.querySelectorAll('.tilt-card').forEach((card) => {
      const noTiltZone = card.closest('.studio-layout') || card.closest('.resume-print-page') || card.matches('.editor-card, .live-preview, .login-card, .contact-form');
      const isHeroCard = card.matches('.stage-shell, .public-orbit, .dashboard-panel, .resume-title-card');
      const maxX = noTiltZone ? 0 : (isHeroCard ? 1.1 : 0.55);
      const maxY = noTiltZone ? 0 : (isHeroCard ? 1.25 : 0.65);

      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
        card.style.setProperty('--local-x', `${x * 100}%`);
        card.style.setProperty('--local-y', `${y * 100}%`);
        card.style.setProperty('--rx', `${(0.5 - y) * maxX}deg`);
        card.style.setProperty('--ry', `${(x - 0.5) * maxY}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });

    document.querySelectorAll('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--btn-x', `${event.clientX - rect.left}px`);
        el.style.setProperty('--btn-y', `${event.clientY - rect.top}px`);
      });
    });

    document.querySelectorAll('[data-swap-stage]').forEach((stage) => {
      stage.addEventListener('pointermove', (event) => {
        const rect = stage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        stage.dataset.active = x < .34 ? '0' : x < .67 ? '1' : '2';
      });
      stage.addEventListener('pointerleave', () => {
        stage.dataset.active = '0';
      });
    });
  }

  function render(scroll = true) {
    const path = routePath();
    let html;
    if (path === 'home' || path === '') html = landingPage();
    else if (path === 'dashboard') html = dashboardPage();
    else if (path.startsWith('studio')) html = studioPage(path.split('/')[1] || 'identity');
    else if (path === 'templates') html = templatesPage();
    else if (path === 'pricing') html = pricingPage();
    else if (path === 'inbox') html = inboxPage();
    else if (path === 'terms') html = termsPage();
    else if (path === 'privacy') html = privacyPage();
    else if (path === 'login' || path === 'signup') html = loginPage(path);
    else if (path.startsWith('u/')) html = publicPage(path.split('/')[1] || 'cj');
    else if (path.startsWith('resume/')) html = resumePrintPage(path.split('/')[1] || 'cj');
    else html = landingPage();
    root.innerHTML = html;
    closeCommand();
    initMotion();
    if (scroll) window.scrollTo({ top: 0, behavior: 'auto' });
  }

  document.addEventListener('click', (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    if (action === 'open-command') openCommand();
    if (action === 'close-command') closeCommand();
    if (action === 'publish') publishDraft();
    if (action === 'logout') logout();
    if (action === 'copy-public-url') copyPublicUrl();
    if (action === 'copy-resume-url') copyResumeUrl();
    if (action === 'select-template') selectTemplate(actionEl.dataset.templateId);
    if (action === 'add-list') addList(actionEl.dataset.list);
    if (action === 'remove-list') removeList(actionEl.dataset.list, actionEl.dataset.index);
    if (action === 'move-list') moveList(actionEl.dataset.list, actionEl.dataset.index, actionEl.dataset.dir);
    if (action === 'export-json') exportJSON();
    if (action === 'export-leads') exportLeadsCSV();
    if (action === 'lead-status') updateLeadStatus(actionEl.dataset.leadId, actionEl.dataset.status);
    if (action === 'lead-note') updateLeadNote(actionEl);
    if (action === 'reset-demo') resetDemo();
    if (action === 'open-resume') openResume();
    if (action === 'close-resume') closeResume();
    if (action === 'print') window.print();
    if (action === 'scroll-to') {
      const target = document.getElementById(actionEl.dataset.target);
      closeResume();
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (action === 'record-prev' || action === 'record-next') {
      const handle = routePath().split('/')[1] || currentProfile().handle;
      const p = profileByHandle(handle).published;
      const length = Math.max((p.progress.records || []).length, 1);
      recordIndex = action === 'record-prev' ? (recordIndex - 1 + length) % length : (recordIndex + 1) % length;
      render(false);
    }
  });

  document.addEventListener('input', (event) => {
    const input = event.target;
    if (input.matches('[data-bind], [data-list-field]')) updateInput(input);
    if (input.matches('[data-command-input]')) {
      const q = input.value.toLowerCase();
      palette.querySelectorAll('[data-command-item]').forEach((item) => {
        item.hidden = q && !item.textContent.toLowerCase().includes(q);
      });
    }
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form.matches('[data-login-form]')) {
      event.preventDefault();
      login(form);
    }
    if (form.matches('[data-contact-form]')) {
      event.preventDefault();
      contact(form);
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      palette.classList.contains('open') ? closeCommand() : openCommand();
    }
    if (event.key === 'Escape') {
      closeCommand();
      closeResume();
    }
  });

  let cursorFrame = null;
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 3;
  document.addEventListener('pointermove', (event) => {
    cursorX = event.clientX;
    cursorY = event.clientY;
    if (cursorFrame) return;
    cursorFrame = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--mx', `${cursorX}px`);
      document.documentElement.style.setProperty('--my', `${cursorY}px`);
      if (glow) {
        glow.style.setProperty('--mx', `${cursorX}px`);
        glow.style.setProperty('--my', `${cursorY}px`);
      }
      cursorFrame = null;
    });
  }, { passive: true });

  window.addEventListener('hashchange', () => {
    closeResume();
    render(true);
    hydrateFromCloudBase();
  });

  if (!location.hash && routePath() === 'home') navigate('home');
  render(false);
  hydrateFromCloudBase();
}());
