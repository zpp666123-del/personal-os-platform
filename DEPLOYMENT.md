# 个人能力 OS · 公网部署说明

这个目录已经是可部署项目。带 `/api/*` 后端接口时推荐部署到 Vercel；GitHub Pages 只能作为静态预览。

## 方案 A：Vercel Drop，最快

1. 打开 https://vercel.com/drop 并登录。
2. 把整个 `personal-os_platform_v8_deploy_ready` 文件夹拖进去。
3. 项目名可以填 `personal-os` 或 `ability-os`。
4. 等待部署完成，复制 Vercel 给出的公网链接。
5. 测试这些地址：
   - `/`
   - `/u/cj`
   - `/resume/cj`
   - `/#/studio/identity`

本包已经带有 `vercel.json`，用于支持 `/u/cj`、`/resume/cj` 这类更像正式产品的公开链接。

## 方案 B：Netlify Drop

1. 登录 Netlify。
2. 进入 Add new site / Deploy manually 或 Netlify Drop。
3. 拖入整个项目文件夹。
4. 部署完成后测试 `/u/cj` 和 `/resume/cj`。

本包已经带有 `netlify.toml` 和 `_redirects`。

## 方案 C：Cloudflare Pages Direct Upload

1. 登录 Cloudflare Dashboard。
2. Workers & Pages → Create application → Pages → Upload assets。
3. 上传整个项目文件夹。
4. 部署完成后测试 `/u/cj` 和 `/resume/cj`。

本包已经带有 `_redirects` 和 `wrangler.toml`。

## 方案 D：GitHub Pages

1. 新建 GitHub 仓库。
2. 把本目录里的文件全部上传到仓库根目录。
3. 进入 Settings → Pages，选择 GitHub Actions 发布。
4. 推送到 `main` 后等待 Actions 完成。

注意：GitHub Pages 不运行 `api/` 目录下的后端接口。

注意：如果用 GitHub Pages 的项目子路径，例如 `username.github.io/repo-name/`，建议分享 hash 链接，例如：
`https://username.github.io/repo-name/index.html#/u/cj`。

## 当前版本说明

当前是静态前端 MVP，用 localStorage 模拟登录、资料、发布和线索。它适合公开展示、产品验证和 Demo 演示。真正商业化上线时，建议继续接入：

- Supabase / Postgres：存储用户、资料、草稿、发布版本、线索。
- Clerk 或 Supabase Auth：真实登录与权限。
- Supabase Storage / Cloudflare R2：头像、项目图、PDF 简历。
- Resend：联系表单邮件通知。
- Vercel / Cloudflare：自定义域名和边缘部署。

## Demo 账号

邮箱：demo@ability.local
密码：demo123
