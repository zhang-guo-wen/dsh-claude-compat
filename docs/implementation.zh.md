---
description: "DeepSeek Harness 的 Claude Code 兼容：.claude/skills 发现、CLAUDE.md 记忆文件与作用域规则。"
kind: "package-reference"
---

# @zhang-guo-wen/dsh-claude-compat

[English](implementation.md) | 中文

> 包参考文档。插件"有什么用"见[仓库 README](../README.zh.md)。

## 概要

Claude Code 把技能放在 `<root>/.claude/skills/<name>/SKILL.md`，把记忆放在 `CLAUDE.md` 文件与自动记忆索引里，并把作用域规则放在 `.claude/rules/**` 下的 markdown 文件。本包让 Harness 三者都能读：在共享的技能注册表（`dsh-skill`）上再注册一个技能 provider，使 `.claude/skills` 进入会话目录；加载 Claude Code 会加载的每一个记忆文件 —— 含 Harness 工作区指令加载器也认领的 `CLAUDE.md` 与 `CLAUDE.local.md` 两个名字，因此那两个名字的段落会从该加载器的消息里剥掉；折叠 `.claude/rules/**` —— 带 `paths:` 作用域的规则在读取匹配文件时折叠，否则在首次请求折叠。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [模型体验](#model-experience)
- [已知限制与待办](#known-limitations-and-deferred-work)
- [开发说明](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

与技能注册表一起挂载；需要 `ctx.skills`。用 profile 的 `patch` 或预设组合像其他插件一样插入即可。

```yaml
- name: '@deepseek-ai/dsh-skill'
- name: '@deepseek-ai/dsh-claude-compat'
```

| 字段 | 默认 | 含义 |
|---|---|---|
| `providerName` | `claude-code` | 注册在 `ctx.skills` 上的唯一 provider 名 |
| `claudeHome` | `$CLAUDE_CONFIG_DIR`、`$CLAUDE_HOME` 或 `~/.claude` | Claude Code 目录；扫描其 `skills`、`CLAUDE.md` 与 `projects` |
| `projectRootMarkers` | `['.git']` | 识别项目根的目录条目 |
| `skills` | `true` | 把 `.claude/skills` 根加进会话技能目录 |
| `includeProjectRoot` | `true` | 扫描项目 `.claude/skills` 根 |
| `includeGlobalRoot` | `true` | 扫描用户 `~/.claude/skills` 根 |
| `memory` | `true` | 把 Claude Code 记忆文件折进请求 |
| `includeProjectRule` | `true` | 加载项目 `CLAUDE.md` 链 |
| `includeGlobalRule` | `true` | 加载用户 `~/.claude/CLAUDE.md` |
| `includeNestedMemory` | `true` | 读到某目录下的文件后加载该目录的记忆文件 |
| `includeManagedMemory` | `true` | 加载托管策略记忆文件 |
| `managedMemoryPath` | 各平台策略路径 | 要加载的托管策略记忆文件 |
| `includeAutoMemory` | `true` | 加载自动记忆索引 `MEMORY.md` |
| `autoMemoryDirectory` | 由仓库路径推导 | 改用指定的自动记忆目录 |
| `takeOverClaudeMd` | `true` | 独占 `CLAUDE.md`/`CLAUDE.local.md`；置为 false 则交回工作区指令加载器 |
| `maxMemorySourceBytes` | `4194304` | 单个记忆文件的最大 UTF-8 字节数 |
| `maxMemoryRenderBytes` | `262144` | 单批记忆渲染的最大 UTF-8 字节数 |
| `maxImportDepth` | `4` | 单个记忆文件最多跟随的 `@path` 导入跳数 |
| `rules` | `true` | 把 `.claude/rules/**` 作用域规则折进请求 |
| `includeProjectRules` | `true` | 折叠项目 `.claude/rules/**` 树 |
| `includeGlobalRules` | `true` | 折叠用户 `~/.claude/rules/**` 树 |
| `maxRuleSourceBytes` | `1048576` | 单个规则文件的最大 UTF-8 字节数 |
| `maxRuleRenderBytes` | `262144` | 单批规则渲染的最大 UTF-8 字节数 |

`skills`、`memory`、`rules` 各有设置页开关，用户可以在不动组合的前提下关掉其中一块。

### 技能

| 等级 | 来源 | 路径 |
|---|---|---|
| 250 | `project-claude` | `<projectRoot>/.claude/skills` |
| 550 | `user-claude` | `~/.claude/skills` |

项目根为最近的、含 `.git` 的祖先目录；没有则用当前 cwd。本 provider 的候选等级低于 DSH 自身项目根，因此同名 DSH 技能优先。技能为 `<root>/.claude/skills/<name>/SKILL.md`（或平级 `<name>.md`），带 YAML frontmatter：必填 `name` 与 `description`，可选 `whenToUse`、`metadata`、`disable-model-invocation`、`user-invocable`。

### 记忆文件

Claude Code 的记忆文件由宽到具体加载，本包保持同样的顺序：

| 范围 | 位置 | 折叠时机 |
|---|---|---|
| 托管策略 | Windows `C:\Program Files\ClaudeCode\CLAUDE.md`；macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`；其余 `/etc/claude-code/CLAUDE.md` | 首次请求 |
| 用户 | `~/.claude/CLAUDE.md` | 首次请求 |
| 项目 | 从项目根到工作目录每一层的 `<dir>/CLAUDE.md`、`<dir>/.claude/CLAUDE.md`，再接 `<dir>/CLAUDE.local.md` | 首次请求 |
| 嵌套 | 工作目录之下某目录的同样三个名字 | `read` 工具触碰到该目录下文件后的那次请求 |
| 自动记忆 | `<claude home>/projects/<repository>/memory/MEMORY.md` | 首次请求 |

每个文件渲染为一个 `Instructions from: <displayPath>` 块。托管、用户、项目与自动记忆文件在首次请求里合并为一条 `user` 消息，loader 为 `claude-code`；某个嵌套目录则用自己的消息折叠，loader 为 `claude-memory`。已被 compaction 遮蔽、不再出现在模型可见历史里的记忆消息，会重新从磁盘读入并折叠。

`CLAUDE.md` 与 `CLAUDE.local.md` 是 Harness 自身 `agent-instructions` 也认领的两个名字，但规则不同：它从同样的目录读这两个名字，但不展开 `@path` 导入、单文件上限是 1 MiB 而不是 4 MiB、会在同目录内按内容去重，而且永远不读托管策略、用户主目录、`<dir>/.claude/CLAUDE.md` 与自动记忆索引。`takeOverClaudeMd`（默认 true）负责化解重叠：这两个名字由本包加载，每个进入步骤的 `agent-instructions` 消息都会去掉其中的 `CLAUDE.md`/`CLAUDE.local.md` 段落。消息本身保留 —— 那个加载器靠消息身份确认基线，被改写过的消息仍算可见基线，因此不会每一步重新组装。`AGENTS.md` 与 `AGENTS.local.md` 继续由那个加载器按自己的规则加载。

`<repository>` 是 git 仓库根 —— 被解析出来的 `.git` 文件会把链接式 worktree 还原到它 —— 并把 `[A-Za-z0-9]` 之外的每个字符替换为 `-`，与 Claude Code 写在 `projects/` 下的目录名一致。只读索引；它旁边的主题文件留在磁盘上，由模型按需读取。

每个被加载的文件都套用两条预处理规则。`@path` 导入就地展开：相对路径相对导入它的文件解析，`~/` 相对进程用户主目录解析，最多 `maxImportDepth` 跳，跳过行内代码与围栏代码块，且每个文件每批至多展开一次，因此重复或循环导入会保持字面量。解析不到可读文件的 token 同样保持字面量 —— 这正是 `@提及` 与邮箱地址不被改动的原因。整行级 HTML 注释会被移除，而行内注释、代码围栏内的注释与未闭合的注释都会保留。

### 作用域规则

`.claude/rules/**`（项目）与 `~/.claude/rules/**`（用户）下的规则以 `claude-rule` loader 折叠。YAML frontmatter 带 `paths:` glob 列表的规则是路径作用域的：在 `read` 到匹配某个 glob 的文件后，折叠进随后的请求。无 `paths`（或空列表）的规则始终生效，像 `CLAUDE.md` 一样在首次请求折叠。glob 相对项目根路径匹配；路径作用域触发使用 Harness 的 `read` 工具，任一匹配规则每次会话至多折叠一次。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部——点击展开</summary>

本节说明发现的组织方式；可观察行为见[使用本包](#use-this-package)。

### 设计概念

技能 provider 沿用 `skill-filesystem` 模型：发现时解析 frontmatter 成目录条目，每次加载重新读取文件，因此正文编辑无需缓存失效。记忆与规则贡献者复用 `agent-instructions` 的 `agent/pre-step` waterfall，把指令折叠在最后一个已接收用户消息之后。两者在存在文件系统服务时优先使用 `ctx.fs`，否则回退到可中断的 Node I/O。

### 源码地图

| 文件 | 角色 |
|---|---|
| [`src/index.ts`](src/index.ts) | 插件入口：注册 provider 与指令/规则监听器 |
| [`src/provider.ts`](src/provider.ts) | 技能 provider：根解析、发现与加载 |
| [`src/parse.ts`](src/parse.ts) | `SKILL.md` frontmatter 解析 |
| [`src/frontmatter.ts`](src/frontmatter.ts) | 技能与规则共用的 YAML frontmatter 解析 |
| [`src/file-text.ts`](src/file-text.ts) | 各加载器共用的 Claude 主目录解析、项目根上溯与文件读取 |
| [`src/memory.ts`](src/memory.ts) | 记忆文件位置、`@path` 导入、注释剥离与自动记忆索引 |
| [`src/instructions.ts`](src/instructions.ts) | 记忆监听器：会话起始批次、每个读到目录的记忆，以及从工作区加载器消息中剥掉自有名字 |
| [`src/render.ts`](src/render.ts) | 在单一字节预算下的 `Instructions from:` 渲染 |
| [`src/rules.ts`](src/rules.ts) | `.claude/rules/**` 发现、`paths:` 匹配与读触发折叠 |
| — | 未发布 run-time invariant 伴生；本包在注册表与消息源契约之外没有独立事件序列或可变数据关系。 |

</details>

-----

<a id="model-experience"></a>
## 模型体验

### 技能目录

#### 模型看到的内容

`dsh-tool-skill` 工具把本 provider 的可调用名与截断描述渲染进会话技能目录，来源标记为 `project-claude`（等级 250）与 `user-claude`（等级 550），模型可与目录中其它条目一样按名调用。

#### Token 影响

每个技能在每次渲染时贡献一条截断描述。技能的正文仅在模型调用该技能时加载，为那次调用添加其内容。

#### KV Cache 影响

目录属于工具表面，跨请求稳定；技能正文按需加载，不改变可复用的请求前缀。

### 记忆与规则指令

#### 模型看到的内容

Claude Code 的记忆文件与作用域规则以 instructions-form 的 `user` 消息到达模型。会话起始批次 —— 托管策略文件、`~/.claude/CLAUDE.md`、从项目根到工作目录每一层的 `CLAUDE.md`、`.claude/CLAUDE.md` 与 `CLAUDE.local.md`，以及自动记忆索引 —— 在首次请求折叠，loader 为 `claude-code`。某子目录的记忆在该目录下文件被 `read` 之后的那次请求折叠，loader 为 `claude-memory`。始终生效的规则（不带 `paths` 的 `.claude/rules/**`）与路径作用域规则同样以 `claude-rule` 到达。工作区指令加载器的 `AGENTS.md` 段落则以它自己的消息到达，其中 `CLAUDE.md`/`CLAUDE.local.md` 段落已被去掉。

##### 记忆指令模板

```markdown
Instructions from: .claude/CLAUDE.md

<memory-body>
```

##### 规则指令模板

```markdown
Instructions from: .claude/rules/api.md

<rule-body>
```

#### Token 影响

会话起始批次与每个嵌套目录每次会话各折叠一次，均受 `maxMemoryRenderBytes` 约束；大于 `maxMemorySourceBytes` 的记忆文件被跳过，自动记忆索引只取前 200 行或 25 KB。被 compaction 遮蔽的记忆消息会在下一次请求重新折叠。每条折叠规则是一条受 `maxRuleRenderBytes` 约束的持久用户角色消息；大于 `maxRuleSourceBytes` 的规则文件被跳过。始终生效的规则每次会话注入一次，作用域规则激活时注入一次。

#### KV Cache 影响

仅追加；折叠的记忆与规则跟随可复用请求前缀，不会使既有 KV 缓存条目失效。

## 已知限制与待办

<a id="known-limitations-and-deferred-work"></a>

- **暂无技能 watch** — provider 在 `list()` 时发现；`.claude/skills` 条目的动态增删改只有再次发现（如另一 provider 失效目录时）才会被拾取。
- **记忆编辑后不重调和** — 记忆文件在首次进入请求时折叠；之后的编辑不会在会话中重读。嵌套目录的记忆只在第一次读到该目录时读取一次。压缩是例外：被遮蔽的记忆消息会重新从磁盘读入。
- **接管依赖工作区加载器的消息格式** — 剥离自有段落匹配的是该加载器写出的 `Instructions from:` / `Additional instructions from:` / `Updated instructions from:` / `Instructions removed:` 标题。格式一变，两个加载器就会各注入一份；`tests/rules-composition.spec.ts` 的组合用例会捕获这种情况。
- **只有 `CLAUDE.md` 的仓库会留下一条空引导语** — 加载器那条消息被保留，以便它仍是可见基线、不会每一步重新组装；代价是那句引导语下面没有内容。
- **嵌套记忆与路径作用域规则仅读触发** — 与 Claude Code 一致，两者都在 `read` 工具触碰匹配文件时折叠；`write`/`edit` 不触发，因此作用域一个文件却撰写该文件的规则或记忆可能不激活。
- **自动记忆在这里是只读的** — harness 会注入 `MEMORY.md`，但从不往里追加，所以会话中的新认知不会进入 Claude Code 自己的存储。
- **不读 Claude Code 的 `settings.json`** — 其中的 `autoMemoryDirectory` 被忽略；覆盖入口是本插件自己的 `autoMemoryDirectory` 字段。
- **导入不做审批闸门** — Claude Code 会在项目记忆文件导入工作目录之外的路径前询问；本包直接解析这类导入。
- **用户级路径规则同样按读触发折叠** — 参考实现静默忽略 `~/.claude/rules` 路径规则；本包对项目与用户两棵树都折叠（各自至多一次）。
- **`AGENTS.md` 与 `CLAUDE.md` 并存加载** — Claude Code 默认只在工作目录及其上方都没有 `CLAUDE.md`/`CLAUDE.local.md` 时才读 `AGENTS.md`；这里工作区加载器仍按自己的规则读它。
- **项目范围是最接近的 `.git` 祖先** — 无该标记的工作区回退到传入的 cwd。
- **畸形条目静默消失** — 无有效 frontmatter 的 `.claude/skills` 文件被跳过，不会出现在目录里。

<a id="dev-note"></a>
### 开发说明

<details>
<summary>维护者工作上下文——点击展开</summary>

无。

</details>
