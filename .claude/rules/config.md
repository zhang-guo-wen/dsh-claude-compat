---
paths:
  - "src/**"
  - "cordis.patch.yml"
  - "package.json"
  - "README.md"
  - "README.zh.md"
  - "tests/**"
---

覆盖什么、何时读：`@guowenzhang/dsh-claude-compat` 插件行的**全部配置字段、默认值与含义**，以及组合里 `config:` 的写法。改配置字段、写 profile 或组合配置，或要回答「某字段默认值是什么 / 这个开关归谁管」时读我。

# 配置

每个字段都有可用的默认值,下表用于覆盖其中某一项。`skills`、`rules`、`memory`、`autoMemory`、`memoryWrite` 各有设置页开关,五个开关互不依赖;组合想换起点,就在行的 `config:` 下写同样的字段,schema 默认值在它之下。

| 字段 | 默认 | 含义 |
|---|---|---|
| `providerName` | `claude-code` | 注册到 `ctx.skills` 的提供器唯一名 |
| `claudeHome` | `$CLAUDE_CONFIG_DIR`、`$CLAUDE_HOME` 或 `~/.claude` | Claude Code 主目录,扫描 `skills`、`CLAUDE.md` 与 `projects` |
| `projectRootMarkers` | `['.git']` | 用来识别项目根的目录项 |
| `skills` | `true` | 把 `.claude/skills` 根加进会话技能目录 |
| `includeProjectRoot` / `includeGlobalRoot` | `true` | 扫描项目 / 用户的 `.claude/skills` 根 |
| `memory` | `true` | 把 Claude Code 的提示词文件（`CLAUDE.md` 及其导入）折进请求 |
| `autoMemory` | `true` | 把自动记忆索引 `MEMORY.md` 折进请求（与 `includeAutoMemory` 同时为真才加载） |
| `memoryWrite` | `false` | 允许模型调用 `claude_memory_write` 写入 Claude 项目自动记忆目录，不依赖加载开关 |
| `includeProjectRule` / `includeGlobalRule` | `true` | 加载项目 / 用户的 `CLAUDE.md` 记忆文件 |
| `includeManagedMemory` | `true` | 加载机器级托管策略记忆文件 |
| `managedMemoryPath` | 各平台策略路径 | 要加载的托管策略记忆文件 |
| `includeNestedMemory` | `true` | 读到某目录下的文件后加载该目录的记忆文件 |
| `includeAutoMemory` | `true` | 加载自动记忆索引 `MEMORY.md` |
| `autoMemoryDirectory` | 由仓库路径推导 | 改用指定的自动记忆目录 |
| `takeOverClaudeMd` | `true` | 独占 `CLAUDE.md`/`CLAUDE.local.md`:由本插件加载,并从工作区指令加载器中剥掉 |
| `maxMemorySourceBytes` | `4194304` | 单个记忆文件最多读取的 UTF-8 字节 |
| `maxMemoryRenderBytes` | `262144` | 单批记忆最多渲染的 UTF-8 字节 |
| `maxImportDepth` | `4` | 单个记忆文件最多跟随的 `@path` 导入跳数 |
| `rules` | `true` | 把 `.claude/rules/**` 作用域规则折进请求 |
| `includeProjectRules` / `includeGlobalRules` | `true` | 折入项目 / 用户的 `.claude/rules/**` 树 |
| `maxRuleSourceBytes` | `1048576` | 单个规则文件最多读取的 UTF-8 字节 |
| `maxRuleRenderBytes` | `262144` | 单批规则最多渲染的 UTF-8 字节 |

```yaml
- name: '@guowenzhang/dsh-claude-compat'
  config:
    skills: true
    memory: true
    rules: false
```

五个开关是插件行 Config 上的 `Volatile` 字段:设置页写入的值不经过重挂载就到达运行中的插件,contributor 每次请求现读它们;写入工具在 Loader 的配置变更事件中同步注册状态。
