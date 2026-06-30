# 个人能力 OS · V8 Productized Platform

这是一个静态前端 MVP，用于验证「个人能力主页生成平台」的成熟产品架构。当前版本已接入 Supabase Auth + Postgres；没有 Supabase 配置时会自动回退到本地 Demo。

## 这版重点

- 产品首页、登录页、应用工作台、公开阅读页分离。
- 公开链接可以直接发给别人阅读：`#/u/cj`。
- 网页版简历可以独立分享：`#/resume/cj`。
- Profile Studio 保持左侧模块、中间编辑、右侧实时预览。
- 公开页不再展示后台导航，访客只看到阅读型导航。
- 导航重新居中，Studio 标题和三栏布局重新约束。
- 动效保持轻量：滚动出现、光泽、轻微 hover，不做夸张位移。
- 保留字段可见性、简历抽屉、发布草稿、模板、线索收件箱。

## 本地运行

```bash
cd personal-os_platform_v8_deploy_ready
python3 -m http.server 5173
```

访问：

```txt
http://localhost:5173/index.html
```

本地 Demo 账号：

```txt
邮箱：demo@ability.local
密码：demo123
```

## 主要路由

```txt
#/home                 产品首页
#/login                登录 / 注册模拟
#/dashboard            工作台
#/studio/identity      Profile Studio：身份资料
#/studio/visibility    隐私可见性
#/studio/hero          主页叙事与能力记录
#/studio/proof         能力证据库
#/studio/projects      项目案例库
#/studio/resume        完整简历档案
#/studio/assets        数字资产库
#/studio/posts         内容观点库
#/studio/contact       发布与线索
#/templates            模板系统
#/pricing              定价草案
#/u/cj                 公开主页，访客直读
#/resume/cj            网页版简历，可打印保存 PDF
#/inbox                联系线索收件箱
```

## Supabase 配置

1. 在 Supabase 新建项目，数据库密码只在 Supabase 控制台使用，不要放进前端或 Vercel 环境变量。
2. 打开 Supabase SQL Editor，运行 [docs/supabase-schema.sql](./docs/supabase-schema.sql)。
3. 在 Supabase Dashboard → Authentication → URL Configuration 设置：

```txt
Site URL:
https://personal-osplatformv8deployready.vercel.app

Redirect URLs:
https://personal-osplatformv8deployready.vercel.app/**
http://localhost:5173/**
```

4. 获取 Project Settings → API 中的 Project URL 和 anon / publishable key。不要使用 service_role key。
5. Vercel 环境变量：

```txt
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

6. 本地静态预览可以直接复制 `supabase-config.sample.js` 为 `supabase-config.js` 并填入公开 URL 和 anon key；留空则走本地 Demo fallback。

## Supabase 数据闭环

- 登录 / 注册：Supabase Auth。
- 登录后自动创建 `profiles` 草稿。
- Studio 自动保存到 `profiles.draft_json`。
- 发布写入 `published_profiles`。
- `/u/:handle` 和 `/resume/:handle` 只读取 `published_profiles`。
- 联系表单写入 `leads`。
- Inbox 只读取当前登录用户自己 profile 下的 leads。
- 私有草稿和线索读取依赖 RLS；前端只使用 anon / publishable key。

## 当前后端接口

当前只保留一个公开配置接口：

- `GET /api/health`：健康检查。
- `GET /api/config`：返回公开的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 给浏览器。

`api/db` 仍可作为旧 Demo 参考，但当前前端不再依赖它保存数据。
