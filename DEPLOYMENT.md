# CloudBase 部署

主线部署到腾讯云 CloudBase 静态网站托管。

先准备干净静态目录，只上传浏览器需要的文件：

```bash
npm run build:cloudbase
```

```bash
npm install
npx tcb login
npm run deploy:hosting
```

云函数：

```bash
npm run deploy:function
```

控制台还需要做三件事：

- 身份认证：开启用户名/密码或邮箱登录，创建 Publishable Key。
- 文档数据库：创建 `profiles`、`published_profiles`、`leads`，按 `docs/cloudbase-setup.md` 配权限。
- 静态托管：索引文档和错误文档都设为 `index.html`。
