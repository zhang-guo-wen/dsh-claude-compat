# dsh-claude-compat

[English](README.md) | 中文

一个**独立**的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件：把你已有的
**Claude Code** 技能、记忆文件与作用域规则加载进会话，并在 Web 设置页用「Claude 兼容」区块的三个开关分别
控制这三块。

它不打包 `@deepseek-ai/*`，这些包在运行时从宿主 harness 解析。

## 这个插件有什么用

- **技能。** 发现 `<项目根>/.claude/skills/**` 与 `~/.claude/skills/**` 进会话技能目录，模型可以和 DSH 自己的
  技能一样按名调用 Claude 技能。
- **记忆文件。** 加载 Claude Code 会加载的那些文件 —— 机器级托管策略 `CLAUDE.md`、`~/.claude/CLAUDE.md`、
  以及从项目根到工作目录每一层的 `CLAUDE.md`、`.claude/CLAUDE.md`、`CLAUDE.local.md` —— 再加自动记忆索引
  `~/.claude/projects/<仓库>/memory/MEMORY.md`，并展开最多四跳的 `@路径` 导入。`CLAUDE.md` 与
  `CLAUDE.local.md` 这两个名字由本插件独占：harness 工作区指令加载器里对应的段落会从每个请求中剥掉，
  所以这些文件按 Claude Code 的规则在本插件加载，且只加载一次。
- **作用域规则。** 折叠 `.claude/rules/**` 与 `~/.claude/rules/**`；带 `paths:` frontmatter 的规则在你读到
  匹配 glob 的文件后生效。
- **设置页。** 技能、记忆、规则各一个开关，每个开关下面列出它加载什么、什么时候加载。

MCP 服务器管理（增删改、按需加载、工具过滤）是**另一个独立插件**
[`@zhang-guo-wen/dsh-mcp-manager`](https://github.com/zhang-guo-wen/dsh-mcp-manager)。

## 安装

构建好的 `lib/` 随仓库提交，所以装完即可运行，**你这边不需要构建**。

```sh
# HTTPS
npx @deepseek-ai/dsh plugin --profile web add git+https://github.com/zhang-guo-wen/dsh-claude-compat.git

# 或 SSH
npx @deepseek-ai/dsh plugin --profile web add git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git
```

建议锁定发布 tag，这样默认分支上后续的临时提交不会被人拿到：

```sh
npx @deepseek-ai/dsh plugin --profile web add "git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git#v0.2.0"
```

要对着本地 checkout 开发，就装目录。pnpm 会建**软链**，所以重建 `lib/` 后下次启动即生效，无需重装：

```sh
npx @deepseek-ai/dsh plugin --profile web add /绝对路径/dsh-claude-compat
```

然后重启 host 并打开设置页：

```sh
npx @deepseek-ai/dsh web
```

**不要手写 profile 清单**：`dsh plugin add` 会同时加依赖条目与 bundle 条目。
卸载用 `dsh plugin --profile web remove @zhang-guo-wen/dsh-claude-compat`，依赖与层一起移除。

## 配置

每个字段都有可用的默认值，下表用于覆盖其中某一项。`skills`、`rules`、`memory` 同时各有设置页开关。

| 字段 | 默认 | 含义 |
|---|---|---|
| `providerName` | `claude-code` | 注册到 `ctx.skills` 的提供器唯一名 |
| `claudeHome` | `$CLAUDE_CONFIG_DIR`、`$CLAUDE_HOME` 或 `~/.claude` | Claude Code 主目录，扫描 `skills`、`CLAUDE.md` 与 `projects` |
| `projectRootMarkers` | `['.git']` | 用来识别项目根的目录项 |
| `skills` | `true` | 把 `.claude/skills` 根加进会话技能目录 |
| `includeProjectRoot` / `includeGlobalRoot` | `true` | 扫描项目 / 用户的 `.claude/skills` 根 |
| `memory` | `true` | 把 Claude Code 记忆文件折进请求 |
| `includeProjectRule` / `includeGlobalRule` | `true` | 加载项目 / 用户的 `CLAUDE.md` 记忆文件 |
| `includeManagedMemory` | `true` | 加载机器级托管策略记忆文件 |
| `managedMemoryPath` | 各平台策略路径 | 要加载的托管策略记忆文件 |
| `includeNestedMemory` | `true` | 读到某目录下的文件后加载该目录的记忆文件 |
| `includeAutoMemory` | `true` | 加载自动记忆索引 `MEMORY.md` |
| `autoMemoryDirectory` | 由仓库路径推导 | 改用指定的自动记忆目录 |
| `takeOverClaudeMd` | `true` | 独占 `CLAUDE.md`/`CLAUDE.local.md`：由本插件加载，并从工作区指令加载器中剥掉 |
| `maxMemorySourceBytes` | `4194304` | 单个记忆文件最多读取的 UTF-8 字节 |
| `maxMemoryRenderBytes` | `262144` | 单批记忆最多渲染的 UTF-8 字节 |
| `maxImportDepth` | `4` | 单个记忆文件最多跟随的 `@path` 导入跳数 |
| `rules` | `true` | 把 `.claude/rules/**` 作用域规则折进请求 |
| `includeProjectRules` / `includeGlobalRules` | `true` | 折入项目 / 用户的 `.claude/rules/**` 树 |
| `maxRuleSourceBytes` | `1048576` | 单个规则文件最多读取的 UTF-8 字节 |
| `maxRuleRenderBytes` | `262144` | 单批规则最多渲染的 UTF-8 字节 |

```yaml
- name: '@zhang-guo-wen/dsh-claude-compat'
  config:
    skills: true
    memory: true
    rules: false
```

## 已知限制

- **没有技能监听器** —— `.claude/skills` 在列出目录时被发现；新增、改名、删除要等下一次发现。
- **记忆每会话只折入一次，不跟随改动** —— 记忆文件在首次进入请求时读取，会话中途的改动不会被重读。子目录记忆
  只在 agent 第一次读到该目录下的文件时读取一次。**压缩是例外**：被 compaction 遮蔽掉的记忆消息会重新从磁盘读入。
- **接管依赖工作区加载器的消息格式** —— 剥掉自有段落依赖该加载器写出的 `Instructions from:` /
  `Additional instructions from:` / `Updated instructions from:` / `Instructions removed:` 标题。该格式变了，
  段落就不再被剥掉、两个加载器会各注入一份；那时 `tests/rules-composition.spec.ts` 的组合用例会失败。
- **只有 `CLAUDE.md` 而没有 `AGENTS.md` 的仓库会留下一条空引导语** —— 加载器那条消息（去掉自有段落后）被保留，
  以便它仍是一份可见基线、不会每一步重新组装；代价是那句「以下工作区指令可能与你相关」下面没有内容。
- **子目录记忆只在 `read` 时触发** —— 嵌套 `CLAUDE.md` 在 `read` 工具触碰到它所在目录的文件时折叠；
  `write` / `edit` 不触发。
- **带路径的规则只在 `read` 时触发** —— `write` / `edit` 不会激活它们。
- **自动记忆只读不写** —— `MEMORY.md` 及其主题文件会作为上下文到达模型，但 harness 不会像 Claude Code 那样
  往里面追加新记忆。
- **不读 Claude Code 的 `settings.json`** —— 其中的 `autoMemoryDirectory` 会被忽略，请改用本插件的
  `autoMemoryDirectory` 字段。
- **导入不做审批闸门** —— Claude Code 会在项目记忆文件导入工作目录之外的路径前询问；本插件直接解析这类导入。
- **`AGENTS.md` 不是兜底项** —— Claude Code 默认只在工作目录及其上方都不存在 `CLAUDE.md`/`CLAUDE.local.md` 时
  才读 `AGENTS.md`；这里工作区指令加载器仍按自己的规则读 `AGENTS.md`，与本插件加载的 `CLAUDE.md` 并存。

## 开发

构建方式、Cordis 插件契约与各种坑见 [AGENTS.md](AGENTS.md)。

```sh
npm run build      # host（tsdown）+ client（rolldown ModuleLoader handoff）
npm run typecheck
```

specs 用 Harness checkout 里的 `vitest` 运行；命令与当前能跑的套件见 [tests/README.md](tests/README.md)。

## 许可

Apache License 2.0 —— 见 [LICENSE](LICENSE)。本项目包含源自 DeepSeek Harness 的 MIT 许可部分，见 [NOTICE](NOTICE)。
与 Claude Code 及其所有者无隶属或背书关系。
