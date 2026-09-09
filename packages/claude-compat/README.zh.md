---
description: "DeepSeek Harness 的 Claude Code 兼容：发现 .claude/skills 并加载 CLAUDE.md 规则。"
kind: "package-reference"
---

# @deepseek-ai/dsh-claude-compat

[English](README.md) | 中文

## 概要

Claude Code 把技能放在 `<root>/.claude/skills/<name>/SKILL.md`，把规则放在 `CLAUDE.md`，并把作用域规则放在 `.claude/rules/**` 下的 markdown 文件。本包让 Harness 三者都能读：在共享的技能注册表（`dsh-skill`）上再注册一个技能 provider，使 `.claude/skills` 进入会话目录；把项目 `.claude/CLAUDE.md` 与用户全局 `~/.claude/CLAUDE.md` 折叠进首次请求，作为独立的 instructions-form 上下文；并折叠 `.claude/rules/**` —— 带 `paths:` 作用域的规则在读取匹配文件时折叠，否则在首次请求折叠。

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
| `claudeHome` | `$CLAUDE_HOME` 或 `~/.claude` | Claude Code 目录；扫描其 `skills` 与 `CLAUDE.md` |
| `projectRootMarkers` | `['.git']` | 识别项目根的目录条目 |
| `includeProjectRoot` | `true` | 扫描项目 `.claude/skills` 根 |
| `includeGlobalRoot` | `true` | 扫描用户 `~/.claude/skills` 根 |
| `includeProjectRule` | `true` | 加载项目 `.claude/CLAUDE.md` 规则 |
| `includeGlobalRule` | `true` | 加载全局 `~/.claude/CLAUDE.md` 规则 |
| `includeProjectRules` | `true` | 折叠项目 `.claude/rules/**` 树 |
| `includeGlobalRules` | `true` | 折叠用户 `~/.claude/rules/**` 树 |
| `maxRuleSourceBytes` | `1048576` | 单个规则文件的最大 UTF-8 字节数 |
| `maxRuleRenderBytes` | `262144` | 单批规则渲染的最大 UTF-8 字节数 |

### 技能

| 等级 | 来源 | 路径 |
|---|---|---|
| 250 | `project-claude` | `<projectRoot>/.claude/skills` |
| 550 | `user-claude` | `~/.claude/skills` |

项目根为最近的、含 `.git` 的祖先目录；没有则用当前 cwd。本 provider 的候选等级低于 DSH 自身项目根，因此同名 DSH 技能优先。技能为 `<root>/.claude/skills/<name>/SKILL.md`（或平级 `<name>.md`），带 YAML frontmatter：必填 `name` 与 `description`，可选 `whenToUse`、`metadata`、`disable-model-invocation`、`user-invocable`。

### 规则

项目 `.claude/CLAUDE.md` 与全局 `~/.claude/CLAUDE.md` 会被读取，并作为 `user` 消息（`claude-code` message-source kind）折叠进首次请求。Harness 自身的 `agent-instructions` 只加载同目录文件名（`AGENTS.md`、`CLAUDE.md`）；本贡献者新增这两个 Claude Code 位置而不改动那个加载器。规则文件缺失或不可读不是致命错误。

### 作用域规则

`.claude/rules/**`（项目）与 `~/.claude/rules/**`（用户）下的规则以 `claude-rule` message-source kind 折叠。YAML frontmatter 带 `paths:` glob 列表的规则是路径作用域的：在 `read` 到匹配某个 glob 的文件后，折叠进随后的请求。无 `paths`（或空列表）的规则始终生效，像 `CLAUDE.md` 一样在首次请求折叠。glob 相对项目根路径匹配；路径作用域触发使用 Harness 的 `read` 工具，任一匹配规则每次会话至多折叠一次。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部——点击展开</summary>

本节说明发现的组织方式；可观察行为见[使用本包](#use-this-package)。

### 设计概念

技能 provider 沿用 `skill-filesystem` 模型：发现时解析 frontmatter 成目录条目，每次加载重新读取文件，因此正文编辑无需缓存失效。指令贡献者复用 `agent-instructions` 的 `agent/pre-step` waterfall，把指令折叠在最后一个已接收用户消息之后。两者在存在文件系统服务时优先使用 `ctx.fs`，否则回退到可中断的 Node I/O。

### 源码地图

| 文件 | 角色 |
|---|---|
| [`src/index.ts`](src/index.ts) | 插件入口：注册 provider 与指令/规则监听器 |
| [`src/provider.ts`](src/provider.ts) | 技能 provider：根解析、发现与加载 |
| [`src/parse.ts`](src/parse.ts) | `SKILL.md` frontmatter 解析 |
| [`src/frontmatter.ts`](src/frontmatter.ts) | 技能与规则共用的 YAML frontmatter 解析 |
| [`src/instructions.ts`](src/instructions.ts) | Claude Code 规则发现与 pre-step 注入 |
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

### 规则指令

#### 模型看到的内容

Claude Code 规则与作用域规则以 instructions-form 的 `user` 消息到达模型，source kind 为 `claude-code` 与 `claude-rule`。始终生效的规则（`.claude/CLAUDE.md`、`~/.claude/CLAUDE.md` 与不带 `paths` 的 `.claude/rules/**`）折叠进首次请求；带 `paths:` glob 的路径作用域规则在 `read` 到匹配文件后折叠进随后的请求。

##### 规则指令模板

```markdown
<system-reminder>
Instructions from: .claude/rules/api.md

<rule-body>
</system-reminder>
```

#### Token 影响

每条折叠规则是一条受 `maxRuleRenderBytes` 约束的持久用户角色消息；大于 `maxRuleSourceBytes` 的规则文件被跳过。始终生效的规则每次会话注入一次，作用域规则激活时注入一次。

#### KV Cache 影响

仅追加；折叠规则跟随可复用请求前缀，不会使既有 KV 缓存条目失效。

## 已知限制与待办

<a id="known-limitations-and-deferred-work"></a>

- **暂无技能 watch** — provider 在 `list()` 时发现；`.claude/skills` 条目的动态增删改只有再次发现（如另一 provider 失效目录时）才会被拾取。
- **Claude/Codex 规则编辑后不重调和** — 与 `agent-instructions` 不同，`.claude/CLAUDE.md` 与 `.codex/AGENTS.md` 只在首次请求折叠一次；之后的编辑不会在会话中重读。作用域规则遵循同样的每次会话一次规则。
- **路径作用域规则仅读触发** — 与 Claude Code 一致，作用域规则在 `read` 工具触碰匹配文件时折叠；`write`/`edit` 不触发，因此作用域一个文件却撰写该文件的规则可能不激活。
- **用户级路径规则同样按读触发折叠** — 参考实现静默忽略 `~/.claude/rules` 路径规则；本包对项目与用户两棵树都折叠（各自至多一次）。
- **项目范围是最接近的 `.git` 祖先** — 无该标记的工作区回退到传入的 cwd。
- **畸形条目静默消失** — 无有效 frontmatter 的 `.claude/skills` 文件被跳过，不会出现在目录里。

<a id="dev-note"></a>
### 开发说明

<details>
<summary>维护者工作上下文——点击展开</summary>

无。

</details>
