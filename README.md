# 个人能力 OS · V8 Productized Platform

这是一个静态前端 MVP，用于验证「个人能力主页生成平台」的成熟产品架构。

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
cd personal-os_platform_v8_productized
python3 -m http.server 5173
```

访问：

```txt
http://localhost:5173/index.html
```

Demo 账号：

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

## 后续真实产品化

当前已提供最小后端接口：

- `GET /api/health`：健康检查。
- `GET /api/db`：读取演示数据库。
- `POST /api/db`：保存账号、草稿、发布版本和线索。

前端会优先同步 `/api/db`，接口不可用时回退到 `localStorage`。正式商业化上线时，建议替换为：

- Next.js App Router
- Supabase / Postgres
- Clerk 或 Supabase Auth
- Supabase Storage / S3 存头像、PDF、项目图
- Vercel 部署，后续支持自定义域名
- Resend/Email API 处理联系通知

数据库草案见 `docs/supabase-schema.sql`。
