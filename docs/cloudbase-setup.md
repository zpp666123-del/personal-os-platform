# CloudBase 初始化

## 集合

创建这些文档数据库集合：

```txt
profiles
published_profiles
leads
```

## 权限

用最少规则先跑通 MVP：

```json
profiles:
{
  "read": "doc.ownerId == auth.uid",
  "create": "doc.ownerId == auth.uid",
  "update": "doc.ownerId == auth.uid",
  "delete": "doc.ownerId == auth.uid"
}

published_profiles:
{
  "read": true,
  "create": "doc.ownerId == auth.uid",
  "update": "doc.ownerId == auth.uid",
  "delete": "doc.ownerId == auth.uid"
}

leads:
{
  "read": "doc.ownerId == auth.uid",
  "create": false,
  "update": "doc.ownerId == auth.uid",
  "delete": false
}
```

线索由 `submitLead` 云函数写入，前端访客不能直接写 `leads`；主页拥有者可以更新自己的线索状态。

## 登录

开启其中一种即可：

```txt
用户名/密码登录：推荐，最省事
邮箱登录：也可以，但邮箱发信配置要单独检查
```

前端注册时会先尝试邮箱密码；如果环境没开邮箱注册，会自动用邮箱派生一个 CloudBase username 注册。

## 静态托管

CloudBase 静态托管设置：

```txt
索引文档：index.html
错误文档：index.html
```

这样直接打开 `/u/cj`、`/resume/cj` 不会 404。

## 云函数

部署：

```bash
npx tcb fn deploy submitLead --force
```

函数权限需要只放开 `submitLead`，保留其它函数的登录限制：

```json
{
  "submitLead": {
    "invoke": true
  },
  "*": {
    "invoke": "auth != null && auth.loginType != 'ANONYMOUS'"
  }
}
```

数据校验在函数里做，单条留言最长 1000 字。

## 存储

当前 UI 还没有头像/PDF 上传控件，先不开存储写入。后续要做头像、项目封面、PDF 简历时，再用 CloudBase Storage。
