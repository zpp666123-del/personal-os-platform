# 域名和上线方案

更新时间：2026-07-02

## 当前状态

- GitHub Pages 已上线：`https://zpp666123-del.github.io/personal-os-platform/`
- CloudBase 环境可用：`cloud1-d7gxeq5sja197907d`，CLI 显示状态 Normal。
- CloudBase 静态托管已部署最新文件，`submitLead` 和 `trackVisit` 云函数已部署。
- CloudBase 环境当前有到期时间：2026-07-17 00:08:08，需要到期前续费、续期或升级。
- CloudBase 默认域名 CLI 显示 Online，但本机直接访问超时；正式对外不建议依赖默认域名，建议绑定已备案自定义域名后再作为正式入口。

## 推荐方案

先用这套，最省事，也最适合国内访问：

```txt
腾讯云 CloudBase 静态托管 + CloudBase 云函数/数据库 + DNSPod 免费解析 + .cn / .com.cn 域名
```

原因：

- 项目已经接入 CloudBase Auth、数据库、云函数、云存储和静态托管，不用换平台。
- CloudBase 静态托管支持 HTTPS、自定义域名、CLI 部署和 CDN。
- CloudBase 官方建议生产环境绑定已备案自定义域名。
- DNS 解析不需要买专业版，普通 CNAME 解析够用。

## 费用预估

域名是主要固定成本：

- `.cn` / `.com.cn` 通常比 `.com` 便宜，更适合国内个人项目。
- 阿里云页面显示 `.cn` 约 42 元/年，`.com` 约 95 元/年，实际以下单页为准。
- 腾讯云域名价格也可以看实时价，买哪里都行，能做实名认证和备案即可。

CloudBase 小流量成本很低：

- 免费体验环境官方写的是 3000 点/月，但需要留意到期和续期规则。
- 静态托管流量官方计费是 0.21 元/GB。
- 静态托管存储官方计费是 0.00394 元/GB/天。
- HTTP 调用官方计费是 0.03 元/万次。

## DNS 接入步骤

拿到域名后按这个顺序做：

1. 域名实名认证。
2. 如果用 CloudBase 国内正式入口，先完成 ICP 备案。
3. CloudBase 控制台进入 HTTP 网关或自定义域名配置。
4. 添加自定义域名，例如 `www.yourname.cn`。
5. CloudBase 会给出 CNAME 值。
6. 去 DNSPod 或域名注册商 DNS 面板添加 CNAME：

```txt
主机记录：www
记录类型：CNAME
记录值：CloudBase 控制台给出的 CNAME
```

7. 回 CloudBase 控制台等待状态变为已生效。
8. 把 `www.yourname.cn` 加到 CloudBase Web 安全域名。
9. 在站内个人身份里把个人域名改成 `www.yourname.cn`。

## 备选方案

### GitHub Pages + 自定义域名

适合先公开展示，几乎免费，但国内访问稳定性不如国内云厂商。GitHub Pages 自定义子域名需要在 GitHub Pages 设置里填写域名，并在 DNS 里添加 CNAME 指向 `zpp666123-del.github.io`，不要带仓库名。

### 阿里云 OSS 静态网站

适合纯静态展示，但这个项目已经有登录、线索、访问统计和上传，继续用 CloudBase 更省。

## 上线判断

现在可以做公开演示上线：

```txt
GitHub Pages：可以直接发给别人看。
CloudBase：代码和函数已部署，但正式国内入口建议等自定义域名和备案完成。
```

正式当商品卖之前，还差这几件：

1. 买域名并完成实名认证。
2. 备案。
3. 绑定 CloudBase 自定义域名。
4. 用手机流量实测首页、公开页、注册登录、发布、联系表单、Inbox。
5. 到 CloudBase 控制台确认环境续期或升级，避免 2026-07-17 到期。

## 参考

- CloudBase 静态网站托管：https://cloud.tencent.com/document/product/876/123943
- CloudBase 访问静态网站资源：https://docs.cloudbase.net/service/access-static-hosting
- CloudBase 自定义域名：https://docs.cloudbase.net/service/custom-domain
- CloudBase 资源点价格：https://cloud.tencent.com/document/product/876/127357
- 阿里云域名价格：https://wanwang.aliyun.com/domain
- GitHub Pages 自定义域名：https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
