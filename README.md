# 个人能力 OS · CloudBase 国内版

这是一个静态前端 MVP，用来做个人数字名片、作品集、项目展示、IP 聚合和网页版简历。当前主线已切到腾讯云 CloudBase：静态托管、登录、文档数据库、云函数联系表单。未配置 CloudBase 时自动回退本地 Demo。

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
npx tcb fn deploy submitLead --force
npx tcb hosting deploy .cloudbase-dist -e YOUR_FULL_CLOUDBASE_ENV_ID
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

## 旧海外版

旧 Vercel + Supabase 线上站可以继续作为海外备份；这份主代码已经不再依赖 Supabase。
