# dsh-claude-compat

[English](README.md) | 中文

## 背景：DeepSeek Harness

DeepSeek Harness（`dsh`）是 DeepSeek AI 开源的 agent harness，几乎所有能力都是 [Cordis](https://github.com/cordiverse/cordis) 插件。它处于 **developer preview** 阶段、迭代很快，会有破坏性变更（[文档站](https://deepseek-harness.github.io/deepseek-harness/)，`0.1.7-alpha.*`）；本插件是独立第三方包，`@deepseek-ai/*` 运行时从宿主解析。

## 这个插件解决什么问题

已经写在 Claude Code `.claude/` 目录里的技能、记忆文件与作用域规则，DSH 会话一个都看不到；本插件把它们全部加载进来，并在 **设置 → Claude 兼容** 里各给一个开关。

## 截图

截图待补 —— 本插件目前还没有可捕获的界面截图。

## 安装

```sh
npx @deepseek-ai/dsh plugin --profile web add @guowenzhang/dsh-claude-compat
```

来自 npm 官方源：<https://www.npmjs.com/package/@guowenzhang/dsh-claude-compat>。装完重启宿主；本地目录开发安装、git 源与排查见 [AGENTS.md](AGENTS.md)。

## 用法

### 打开设置页

插件在设置页里加了一块：**设置 → Claude 兼容**。它有三个开关 —— **加载技能**、**加载记忆**、**加载规则** —— 每一行下面列出该开关加载什么、什么时候加载，页面自己就把兼容面说清楚，不必去翻 README。三个开关默认全开；开关是实时设置，翻转后运行中的插件立即生效，不需要重启宿主。

### 加载 Claude Code 技能

**加载技能** 把两个根加进会话技能目录：项目的 `<项目根>/.claude/skills/**` 与用户的 `~/.claude/skills/**`。项目根是最近的、含 `.git` 的祖先目录；没有就用当前工作目录。技能为 `<root>/.claude/skills/<name>/SKILL.md`，或平级的 `<name>.md`，带 `name` 与 `description` frontmatter。同名时 DSH 自己的技能优先。发现发生在列出技能目录时，所以新增、改名、删除的技能要等下一次发现，不会立即生效。

### 加载记忆文件

**加载记忆** 把 Claude Code 会加载的文件由宽到具体折进请求：

| Memory file | Where it comes from | When it folds |
|---|---|---|
| Managed policy | 平台托管策略 `CLAUDE.md` | 会话开始 |
| User | `~/.claude/CLAUDE.md` | 会话开始 |
| Project | 从项目根到工作目录每一层的 `CLAUDE.md`、`.claude/CLAUDE.md` 与 `CLAUDE.local.md` | 会话开始 |
| Nested | 工作目录之下某目录的同样三个名字 | `read` 工具触碰到该目录下文件后的那次请求 |
| Auto memory | `~/.claude/projects/<仓库>/memory/MEMORY.md` | 会话开始；只读取索引，最多前 200 行或 25 KB |

`@path` 导入就地展开，相对导入它的文件解析，最多四跳；解析不到可读文件的 token 保持字面量 —— 这正是 `@提及` 与邮箱地址不被改动的原因。`CLAUDE.md` 与 `CLAUDE.local.md` 这两个名字由本插件独占：它们的段落会从宿主自己的工作区指令消息里剥掉，因此这些文件在这里、按 Claude Code 的规则、只加载一次。`AGENTS.md` 不受影响，继续由宿主加载。

### 加载作用域规则

**加载规则** 折叠项目的 `.claude/rules/**` 与用户的 `~/.claude/rules/**`。frontmatter 里没有 `paths:` 的规则始终生效，像 `CLAUDE.md` 一样在会话开始时折叠。带 `paths:` glob 列表的规则是路径作用域的：在你 `read` 到匹配某个 glob 的文件后，折叠进随后的请求；glob 相对项目根路径匹配，且每次会话至多折叠一次。唯一的触发是读 —— `write` 与 `edit` 永远不会激活作用域规则。

### 默认值

| Setting | Default |
|---|---|
| **加载技能** | 开 —— `.claude/skills/**` 与 `~/.claude/skills/**` 在技能目录里 |
| **加载记忆** | 开 —— 记忆文件与自动记忆索引在会话开始时折叠 |
| **加载规则** | 开 —— 始终生效的规则在会话开始时折叠，带 `paths:` 的规则在匹配的读之后折叠 |

## 注意事项

- **没有技能监听器。** `.claude/skills` 在列出技能目录时被发现；新增、改名、删除要等下一次发现。
- **记忆每会话只折入一次，不跟随改动。** 记忆文件在首次进入请求时读取，会话中途的改动不会被重读。子目录记忆只在 agent 第一次读到该目录下的文件时读取一次。压缩是例外：被 compaction 遮蔽掉的记忆消息会重新从磁盘读入。
- **只有 `CLAUDE.md` 而没有 `AGENTS.md` 的仓库会留下一条空引导语。** 宿主加载器那条消息（去掉本插件自有段落后）被保留，以便它仍是一份可见基线、不会每一步重新组装；代价是那句「以下工作区指令可能与你相关」下面没有内容。
- **子目录记忆只在 `read` 时触发。** 嵌套 `CLAUDE.md` 在 `read` 工具触碰到它所在目录的文件时折叠；`write` 与 `edit` 不触发。
- **带路径的规则只在 `read` 时触发。** `write` 与 `edit` 不会激活它们。
- **自动记忆只读不写。** `MEMORY.md` 及其主题文件会作为上下文到达模型，但 harness 不会像 Claude Code 那样往里面追加新记忆。
- **不读 Claude Code 的 `settings.json`。** 其中的 `autoMemoryDirectory` 会被忽略，请改用本插件的 `autoMemoryDirectory` 字段。
- **导入不做审批闸门。** Claude Code 会在项目记忆文件导入工作目录之外的路径前询问；本插件直接解析这类导入。
- **`AGENTS.md` 不是兜底项。** Claude Code 默认只在工作目录及其上方都不存在 `CLAUDE.md`/`CLAUDE.local.md` 时才读 `AGENTS.md`；这里宿主的工作区指令加载器仍按自己的规则读 `AGENTS.md`，与本插件加载的 `CLAUDE.md` 并存。

## 许可

Apache License 2.0 —— 见 [LICENSE](LICENSE)。本项目包含源自 DeepSeek Harness 的 MIT 许可部分，见 [NOTICE](NOTICE)。与 Claude Code 及其所有者无隶属或背书关系。

## 延伸阅读

- [AGENTS.md](AGENTS.md) —— 安装变体、完整字段表、构建、部署与生效语义、发版步骤与排查。
- [docs/implementation.md](docs/implementation.md) —— 包参考文档：发现规则、记忆与规则折叠、模型体验。
- [tests/README.md](tests/README.md) —— spec 命令与每个命令覆盖的套件。
- [@guowenzhang/dsh-mcp-manager](https://github.com/zhang-guo-wen/dsh-mcp-manager) —— 姊妹插件，负责 MCP 服务器管理（行的增删改、按需加载、工具过滤）；本仓不含任何 MCP 代码。
- [DeepSeek Harness 文档](https://deepseek-harness.github.io/deepseek-harness/)。
