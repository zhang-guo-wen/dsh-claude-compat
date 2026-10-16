---
paths:
  - "src/**"
  - "cordis.patch.yml"
  - "package.json"
  - "docs/**"
  - "README.md"
  - "README.zh.md"
---

覆盖什么、何时读：四条技术决策（仓库根即包、`CLAUDE.md` 独占、开关做成 `Volatile` 字段、消息源用通用 `plugin` kind）及其理由与被否决的替代方案。要改这些设计、或需要向别人解释「为什么这么写」时读我。

# 技术决策

- **仓库根就是包,不放进 `packages/*`** —— `dsh plugin add <git-url>` 取的是仓库根,放进子目录会被装成错误的东西(见「目录」)。
- **`CLAUDE.md`/`CLAUDE.local.md` 由本插件独占,而不是让两个加载器并存** —— 这两个名字 harness 的 `agent-instructions` 也会读,但规则不同(不展开 `@import`、1 MiB 上限、同目录去重);接管把这两个名字收敛到 Claude Code 的规则上,代价是剥段落依赖对方的消息格式(见「易崩清单」第 6 条)。
- **四个开关做成插件行的 `Volatile` 字段,而不是另开一个 settings 命名空间** —— settings 服务一个命名空间只有一个 registrant(见「MCP 管理已拆分」),放在行 Config 上则设置页写入不需要重挂载。
- **消息源一律用通用 `plugin` kind,不自造 kind** —— Session 格式迁移只认发布版能产出的那张固定 kind 表,自造 kind 会让历史会话打不开;harness 明确否决过"让插件注册迁移"的方案(见「易崩清单」第 5 条)。
