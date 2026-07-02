(function () {
  'use strict';

  const DEFAULT_PROFILE = {
    profileMode: 'job',
    identity: {
      name: 'CJ / 你的名字',
      handle: 'cj',
      title: 'AI 产品创业者 · Agent Builder · 内容创作者',
      avatar: 'CJ',
      avatarUrl: '',
      city: 'London / Remote',
      location: 'London / Remote',
      status: '开放求职、副业、项目共创',
      website: 'yourname.site',
      email: 'hello@yourname.site',
      phone: '+86 138 0000 0000',
      wechat: 'your-wechat-id',
      age: '25',
      gender: '不公开',
      residence: '伦敦 / 可远程',
      expectedLocation: '上海、杭州、深圳、远程',
      expectedRole: 'AI 产品经理 / Agent 应用开发 / FDE',
      expectedSalary: '面议 / 按机会沟通',
      availability: '2 周内可开始 / 可远程协作',
      resumePdfUrl: '#'
    },
    visibility: {
      name: 'public',
      title: 'public',
      city: 'public',
      location: 'public',
      status: 'public',
      website: 'public',
      email: 'public',
      phone: 'request',
      wechat: 'request',
      age: 'private',
      gender: 'private',
      residence: 'details',
      expectedLocation: 'public',
      expectedRole: 'public',
      expectedSalary: 'request',
      availability: 'public',
      education: 'details',
      major: 'details',
      work: 'details',
      projectExperiences: 'details',
      certificates: 'details',
      resumePdf: 'public'
    },
    hero: {
      badge: 'AI 时代的个人能力入口',
      headline: '把个人能力，做成可验证的入口。',
      intro: '整合简历、项目、公开记录、数字资产和联系方式，让机会更容易理解你、信任你、联系你。',
      primaryCta: '查看能力证据',
      secondaryCta: '查看完整简历'
    },
    metrics: [
      { label: '已发布项目', value: '12+', desc: '可访问链接与案例' },
      { label: '内容输出', value: '68', desc: '文章、复盘、教程' },
      { label: '合作状态', value: '开放中', desc: '远程优先' }
    ],
    progress: {
      current: 6,
      total: 100,
      label: '能力记录',
      milestones: [
        { label: 'S1', value: '主页上线' },
        { label: 'S2', value: '证据资产' },
        { label: 'S3', value: '商业验证' },
        { label: 'S4', value: '平台化' }
      ],
      records: [
        { day: 6, date: 'Monday, 29 June 2026', title: '发布个人主页 V1', revenue: '+3 项证据', expense: '-1 个漏洞', net: '+2', note: '把个人简历、项目和联系方式聚合到同一个公开入口。' },
        { day: 5, date: 'Sunday, 28 June 2026', title: '完成项目证据卡', revenue: '+1 个案例', expense: '-0', net: '+1', note: '把 AI 知识库问答助手整理成可展示的项目案例。' },
        { day: 4, date: 'Saturday, 27 June 2026', title: '梳理数字资产', revenue: '+6 个链接', expense: '-0', net: '+6', note: '聚合 GitHub、博客、社媒、作品集、简历和邮箱。' }
      ]
    },
    proof: [
      { title: 'Agent 开发', desc: '基于大模型、工具调用和工作流构建智能体应用。', tags: ['Agent', 'RAG', 'Workflow'] },
      { title: '全栈实现', desc: '从产品设计到前端、后端、部署的端到端交付。', tags: ['React', 'Node.js', 'Deploy'] },
      { title: '业务理解', desc: '把模糊需求拆成可验证方案，兼顾体验、数据和交付。', tags: ['需求分析', '数据驱动', '增长'] },
      { title: '内容 / IP', desc: '持续输出方法论、教程和公开复盘，形成长期信任。', tags: ['Blog', 'Video', 'Build Log'] }
    ],
    story: {
      title: '我想把真实的能力展示给你看。',
      body: '不是只放一份简历，也不是堆一堆社交链接。我希望把一个人的项目、经历、内容、资产和正在构建的过程放到同一个入口里。'
    },
    projects: [
      { title: 'AI 知识库问答助手', role: '产品设计 / 全栈实现', summary: '面向企业文档的问答系统，支持多源检索、引用和权限控制。', result: '把内部文档问答从人工检索缩短为带引用的即时回答。', tags: ['AI Agent', 'RAG', 'Next.js'], url: '#', coverUrl: '' },
      { title: '数据中台可视化平台', role: '前端架构 / 数据产品', summary: '从数据接入到指标看板的分析平台，支持自定义维度和多角色协作。', result: '沉淀可复用指标看板，让运营、销售和管理者共用一套数据口径。', tags: ['Dashboard', 'React', 'Node.js'], url: '#', coverUrl: '' },
      { title: '个人知识管理系统', role: '独立开发', summary: '沉淀项目、内容、灵感和复盘，支持标签、双链和智能搜索。', result: '把分散资料整理成可搜索、可复盘、可复用的个人知识资产。', tags: ['Knowledge', 'MongoDB', 'Search'], url: '#', coverUrl: '' }
    ],
    assets: [
      { type: 'github', label: 'GitHub', value: '@yourname', url: '#' },
      { type: 'blog', label: '博客 / 内容', value: 'yourname.site/blog', url: '#' },
      { type: 'social', label: '小红书 / X', value: '@yourname', url: '#' },
      { type: 'portfolio', label: '作品集', value: '精选项目合集', url: '#' },
      { type: 'email', label: '邮箱', value: 'hello@yourname.site', url: 'mailto:hello@yourname.site' },
      { type: 'qr', label: '二维码名片', value: '扫码联系 / 查看简历', url: '#' }
    ],
    resume: {
      summary: 'AI 产品、全栈开发和内容输出复合背景。适合需要快速验证想法、搭建原型、沉淀案例和推动产品落地的团队。',
      skills: ['AI 产品', 'Agent 开发', 'React', 'Node.js', '产品设计', '数据分析', '内容创作', '增长验证'],
      stack: ['Figma', 'Cursor', 'VS Code', 'React', 'Next.js', 'Node', 'Python', 'CloudBase'],
      expectations: {
        roles: 'AI 产品经理 / FDE / 全栈开发',
        cities: '上海、杭州、深圳、远程',
        type: '全职 / 项目合作 / 产品共创',
        startDate: '2 周内可开始'
      },
      education: [
        { period: '2016 — 2020', school: '某某大学', degree: '本科', major: '软件工程 / 计算机相关专业', city: '杭州', desc: '系统学习计算机基础、Web 开发、数据库和软件工程。' }
      ],
      work: [
        { period: '2026 — 至今', company: '个人能力 OS', role: 'Founder / Builder', location: 'Remote', desc: '把个人官网生成器做成轻量平台，验证模板、编辑器、公开页和联系线索闭环。', result: '完成 Profile Studio、公开页发布、字段可见性和线索收集静态 MVP。' },
        { period: '2022 — 2026', company: '产品实践项目', role: 'AI 产品与全栈开发', location: 'Remote / Hybrid', desc: '构建 Agent、知识库、自动化、数据中台等项目。', result: '独立完成多端页面与部署，把模糊需求转化为可验证 MVP。' }
      ],
      projectExperiences: [
        { period: '2026', title: '企业知识库问答系统', role: '产品设计 / 全栈实现', desc: '基于文档解析、向量检索和大模型生成搭建内部问答助手。', result: '支持引用、权限和多源检索。', stack: ['RAG', 'Next.js', 'CloudBase'] },
        { period: '2026', title: '个人主页生成平台', role: '产品 Owner', desc: '从单人作品集扩展到多人可用的小平台。', result: '完成可注册、编辑、发布、收线索的静态 MVP。', stack: ['Vanilla JS', 'localStorage', 'Template System'] }
      ],
      certificates: [
        { name: '英语 CET-6 / 可替换', issuer: '教育部考试中心', date: '2020', url: '#' },
        { name: 'AI 产品实战训练营 / 可替换', issuer: '课程 / 社群', date: '2026', url: '#' }
      ],
      languages: ['中文：母语', '英文：工作沟通']
    },
    posts: [
      { title: '如何用 AI Agent 提升个人生产力系统', type: '方法论', summary: '把个人工作流拆成可复用的输入、处理和输出系统。', meta: '文章 · 2026-06-20', views: '1.2k', tags: ['AI Agent', '效率'], url: '#', coverUrl: '' },
      { title: '从 0 到 1 搭建知识库问答系统的完整指南', type: '技术实践', summary: '用真实项目拆解文档解析、检索、引用和权限控制。', meta: '文章 · 2026-06-12', views: '2.3k', tags: ['RAG', '教程'], url: '#', coverUrl: '' },
      { title: 'B 端数据可视化设计的 5 个关键原则', type: '设计方法', summary: '总结指标口径、信息层级和角色视角对看板体验的影响。', meta: '文章 · 2026-05-28', views: '856', tags: ['Dashboard', '设计'], url: '#', coverUrl: '' }
    ],
    contact: {
      note: '求职、项目合作、内容共创、媒体采访都可以从这里开始。提交联系后，我可以按需要发送完整版 PDF 或进一步联系方式。',
      privacyNote: '手机号、微信、薪资等敏感信息默认联系后可见。',
      intents: ['求职机会', '项目合作', '内容合作', '产品共创', '媒体采访', '其他']
    }
  };

  const SEED_DB = {
    version: '7.0.0-mature-product',
    currentUserId: 'user_cj',
    users: [
      { id: 'user_cj', name: 'CJ / 你的名字', email: 'demo@ability.local', password: 'demo123', createdAt: '2026-06-29T00:00:00.000Z' }
    ],
    templates: [
      { id: 'signal-light', name: 'Signal Light', tone: '轻产品官网', accent: '#315eff', desc: '白底、大标题、胶囊导航、柔和渐变，适合产品、设计、创业者。' },
      { id: 'build-story', name: 'Build Story', tone: '公开记录', accent: '#111111', desc: '强调进度、故事和真实过程，适合创作者、独立开发者、挑战型项目。' },
      { id: 'craft-dark', name: 'Craft Dark', tone: '深色作品集', accent: '#8b5cf6', desc: '高对比暗色版本，适合技术、AI、工程、作品展示。' }
    ],
    profiles: [
      { id: 'profile_cj', ownerId: 'user_cj', handle: 'cj', templateId: 'signal-light', draft: DEFAULT_PROFILE, published: DEFAULT_PROFILE, updatedAt: '2026-06-29T00:00:00.000Z', publishedAt: '2026-06-29T00:00:00.000Z' }
    ],
    leads: [
      { id: 'lead_001', profileId: 'profile_cj', name: '示例访客', email: 'partner@example.com', intent: '项目合作', message: '我想了解是否可以基于这套主页模板为我们社群成员批量生成个人能力页。', note: '', status: 'new', createdAt: '2026-06-29T09:30:00.000Z' }
    ],
    views: [
      { id: 'view_000', profileId: 'profile_cj', profileHandle: 'cj', source: 'public_profile', createdAt: '2026-06-27T10:20:00.000Z' },
      { id: 'view_001', profileId: 'profile_cj', profileHandle: 'cj', source: 'public_profile', createdAt: '2026-06-29T08:20:00.000Z' },
      { id: 'view_002', profileId: 'profile_cj', profileHandle: 'cj', source: 'resume', createdAt: '2026-06-29T08:35:00.000Z' },
      { id: 'view_003', profileId: 'profile_cj', profileHandle: 'cj', source: 'public_profile', createdAt: '2026-07-01T14:12:00.000Z' },
      { id: 'view_004', profileId: 'profile_cj', profileHandle: 'cj', source: 'public_profile', createdAt: '2026-07-02T09:40:00.000Z' }
    ]
  };

  window.AbilityOSV7 = {
    STORAGE_KEY: 'ability-os-platform-v7-mature-product-db',
    DEFAULT_PROFILE,
    SEED_DB
  };
}());
