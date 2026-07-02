# 个人能力 OS · CloudBase 国内版

这是一个静态前端 MVP，用来做个人数字名片、作品集、项目展示、IP 聚合和网页版简历。当前主线已切到腾讯云 CloudBase：静态托管、登录、文档数据库、云函数联系表单。未配置 CloudBase 时自动回退本地 Demo。

## GitHub 上怎么说

一句话：

```txt
个人能力 OS：一个面向个人品牌、作品集、简历主页和线索收集的轻量级 Web 平台。
```

英文仓库描述：

```txt
Personal Ability OS: a lightweight personal-brand platform for profiles, portfolios, resumes and lead capture, powered by Tencent CloudBase.
```

推荐 Topics：

```txt
personal-brand portfolio resume cloudbase static-site serverless crm
```

## GitHub 怎么维护

日常只记这套流程：

```bash
git status
git add .
git commit -m "docs: update project notes"
git push
```

当前本地分支是 `codex/cloudbase-domestic-stack`。要上线到 GitHub Pages，去 GitHub 开一个 PR 合并到 `main`，合并后 `.github/workflows/pages.yml` 会自动发布静态站。

## 本地运行

```bash
cd personal-os_platform_v8_deploy_ready
python -m http.server 5173
```

访问：

```txt
http://localhost:5173/index.html
```

国内线上站：

```txt
https://cloud1-d7gxeq5sja197907d-1439310375.tcloudbaseapp.com
```

本地 Demo 账号：

```txt
邮箱：demo@ability.local
密码：demo123
```

## 主要路由

```txt
#/home
#/signup
#/login
#/dashboard
#/studio/identity
#/templates
#/u/cj
#/resume/cj
#/inbox
```

## CloudBase 配置

当前已接入环境：

```txt
EnvId: cloud1-d7gxeq5sja197907d
Region: ap-shanghai
Auth: 用户名/密码登录
```

如需换环境：

1. 在腾讯云 CloudBase 创建环境，拿到完整 `EnvId`、地域和 Publishable Key。
2. 开启身份认证里的用户名/密码或邮箱登录。
3. 创建文档数据库集合和权限，见 [docs/cloudbase-setup.md](./docs/cloudbase-setup.md)。
4. 部署云函数 `submitLead`，用于公开页联系表单写入线索。
5. 复制 `cloudbase-config.sample.js` 为 `cloudbase-config.js`，填入：

```js
window.CLOUDBASE_CONFIG = {
  env: 'YOUR_FULL_CLOUDBASE_ENV_ID',
  region: 'ap-shanghai',
  accessKey: 'YOUR_CLOUDBASE_PUBLISHABLE_KEY'
};
```

6. 部署云函数和静态网站：

```bash
npm install
npx tcb login
npm run deploy:function
npm run deploy:hosting
```

CloudBase 静态托管里把索引文档和错误文档都设为 `index.html`，这样 `/u/:handle`、`/resume/:handle` 直达链接才能回到前端路由。

## 数据闭环

- 注册 / 登录：CloudBase Auth。
- 登录后自动创建 `profiles` 草稿。
- Studio 自动保存到 `profiles.draft`。
- 发布写入 `published_profiles`。
- `/u/:handle` 和 `/resume/:handle` 读取 `published_profiles`。
- 联系表单调用 `submitLead` 云函数写入 `leads`。
- Inbox 只读取当前登录用户自己的 leads。

## 产品结构

核心定位、7 个固定模块、组件/库选择见 [docs/product-positioning.md](./docs/product-positioning.md)。

## 后续升级路线

先按这个顺序做，别一上来做太大：

1. **线索管理**：Inbox 已有状态、备注、导出 CSV；下一步补邮件通知。
2. **增长能力**：访问量和 7 日趋势已落地；下一步补表单转化率、来源统计。
3. **商业化**：自定义域名、套餐限制、支付、团队协作。模板风格与主题色已先落地。

## 优化优先级

现在最值得优化的是这几件：

1. **安全**：确认 GitHub 里只放 CloudBase Publishable Key，不放服务端密钥。
2. **部署**：把 `.cloudbase-dist` 的复制命令做成 npm script，减少手工操作。
3. **体验**：补齐加载中、保存失败、空状态和移动端细节。
4. **性能**：图片懒加载、压缩静态资源、减少首屏不必要脚本。
5. **代码维护**：`app.js` 变难改时再拆模块，现在先别为了“看起来高级”拆。

## 旧海外版

旧 Vercel + Supabase 线上站可以继续作为海外备份；这份主代码已经不再依赖 Supabase。
