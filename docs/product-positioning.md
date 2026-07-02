# 产品定位与组件决策

## 核心定位

个人能力 OS 不是普通作品集，也不是单页简历。它要把一个人的项目、能力、作品、履历和联系方式沉淀成一个长期可维护的数字资产页。

用户买到的不是页面，而是这套闭环：

```txt
编辑资料 -> 组织证据 -> 发布主页/简历 -> 收集线索 -> 持续更新
```

## 固定模块

这 7 个模块是产品骨架，代码入口在 `js/product-sections.js`：

| 模块 | 负责什么 | 不负责什么 |
| --- | --- | --- |
| 个人身份 | 姓名、定位、头像、主页文案 | 长篇履历 |
| 社交/IP 聚合 | 社媒、个人域名、二维码、外部入口 | 项目详情 |
| 精选项目 | 3-6 个最能证明能力的项目和证据 | 所有碎片记录 |
| 作品资产 | 文章、视频、复盘、可公开作品 | 私密文件库 |
| 工作/履历 | 教育、工作、项目经历、证书 | 营销话术 |
| 合作方式 | 联系表单、意向、发布和导出 | CRM 全量管理 |
| 隐私可见性 | 字段公开、详情、联系后可见 | 权限系统大平台 |

## 用户体验原则

1. 编辑器按模块走，公开页也按模块走。
2. 用户先填核心身份、项目、联系方式，其他信息后补。
3. 每个模块都要能回答一个问题：这个人是谁、做过什么、能证明什么、怎么联系。
4. 公开页默认展示可信信息，敏感字段走隐私可见性。
5. 商品化先卖结果：长期可维护的数字资产页；不要先卖复杂后台。

## 组件优先级

先用现有 CSS 和原生浏览器能力：

| 需求 | 当前选择 | 加库条件 |
| --- | --- | --- |
| 表单 | 原生 `input`、`textarea`、`select` | 表单校验复杂到重复 3 次以上 |
| 上传 | 原生 `input type="file"` + CloudBase Storage | 需要断点续传/大文件队列 |
| 弹层 | 现有命令面板；新增弹层优先用 `<dialog>` | 需要复杂嵌套弹层 |
| 展开收起 | 原生 `<details>` 或现有 CSS | 需要虚拟列表 |
| 拖拽排序 | 已用上移/下移按钮 | 真有用户要求拖拽，再评估 SortableJS |
| 数据图表 | 已用 CSS 展示 7 日趋势、转化率、来源分布 | 需要复杂筛选时，再评估 Chart.js |
| 动画 | 现有 CSS transition/transform | 出现复杂时间线，再评估 Motion |
| UI 组件库 | 暂不引入 | 页面组件超过 20 个且样式维护吃力，再评估 Web Components/Shoelace |

参考：

- MDN `<dialog>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog
- MDN file input: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file
- MDN Web Components: https://developer.mozilla.org/en-US/docs/Web/API/Web_components
- SortableJS: https://sortablejs.github.io/Sortable/
- Chart.js: https://www.chartjs.org/docs/
- Motion: https://motion.dev/
- Shoelace: https://shoelace.style/

## 下一步功能

按这个顺序做：

1. 邮件通知。Inbox 站内新线索提醒、状态流转、备注与 CSV 导出已先落地。
2. 自定义域名和商业化。自定义域名准备态、模板风格、主题色、访问趋势、转化率和来源分布已先落地；真实域名绑定、套餐、支付等确认托管平台和付费方案后再做。

## 不做

- 不换 React/Vue/Next。
- 不上大型 UI 库。
- 不为了“结构漂亮”拆 CSS。
- 不做团队协作，等个人版跑顺再说。
