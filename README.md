# dsh-standalone-plugins

将 DeepSeek Harness 的定制插件抽成**独立仓库**,通过 `dsh plugin` 或 profile `cordis.patch.yml` 加载,不修改 DeepSeek Harness 官方仓库。

## 包

| 包 | 平面 | 说明 |
|---|---|---|
| `@zhang-guo-wen/dsh-claude-compat` | host | Claude Code 兼容:发现 `.claude/skills`、`CLAUDE.md`、`.claude/rules/**` |
| `@zhang-guo-wen/dsh-command-btw` | host/preset | `/btw` 侧问题,由 fork 的子代理回答 |
| `@zhang-guo-wen/dsh-client-ui-context-injection` | client | 设置页的 rule-injection 开关 UI |
