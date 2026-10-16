---
paths:
  - "src/**"
  - "tests/**"
---

> 覆盖什么、何时读：Claude Code 记忆文件与 `.claude/rules/**` 的加载时机、`CLAUDE.md` / `CLAUDE.local.md` 接管（`agent/pre-step` 剥离）、项目 / 用户 / 托管 / 嵌套 / 自动记忆的 scope 隔离与兼容映射。改 `src/memory.ts`、`src/instructions.ts`，或排查「规则没折进来 / 同一份 `CLAUDE.md` 被注入两次 / 该读哪个目录」时读我。字段默认值与上限见 [config.md](config.md)，崩溃症状见 [pitfalls.md](pitfalls.md)。

# 规则折入、CLAUDE.md 接管与 scope 隔离

## 独占与剥段落（原文「目录」条目）

- **`CLAUDE.md` / `CLAUDE.local.md` 由本插件独占。** 这两个名字 harness 的
  `agent-instructions` 也会读(不展开 `@import`、1 MiB 上限、同目录去重),所以 `src/instructions.ts`
  在每个 `agent/pre-step` 里把该加载器消息中这两个名字的段落剥掉(`Instructions from:` /
  `Additional instructions from:` / `Updated instructions from:` / `Instructions removed:` 四种标题)。
  改 harness 那侧的渲染格式会让剥离静默失效,`tests/rules-composition.spec.ts` 的组合用例就是这条不变量。
  `takeOverClaudeMd: false` 可整个关掉接管。

## 加载时机（`agent/pre-step`）

- `src/instructions.ts` 负责折叠时机：在每个 `agent/pre-step` 里读取并渲染记忆与规则段落，同时完成上面那条剥段落。
- `src/memory.ts` 负责记忆文件本身（位置、`@import` 展开、自动记忆）；共享的文件读取与项目根上溯在 `src/file-text.ts`。
- 共用的 `Instructions from:` 渲染在 `src/render.ts`；消息源在 `src/sources.ts`。
- 注册一律走 `ctx.effect(...)` 收口，依赖的服务用 `ctx.get('x')` 取（见 [plugin-contract.md](plugin-contract.md)）。

## scope 隔离与兼容映射

三类内容各自有开关，总开关（`skills` / `memory` / `rules`）之下再按 scope 细分；默认值与上限逐项见 [config.md](config.md)。

下表按 `config.md` 的字段语义整理，**原文没有这张矩阵**；字段本身以 `config.md` 为准。

| scope | 技能（`.claude/skills`） | 记忆（`CLAUDE.md` / `MEMORY.md`） | 作用域规则（`.claude/rules/**`） |
|---|---|---|---|
| 项目 | `includeProjectRoot` | `includeProjectRule` | `includeProjectRules` |
| 用户 | `includeGlobalRoot` | `includeGlobalRule` | `includeGlobalRules` |
| 机器托管 | — | `includeManagedMemory` + `managedMemoryPath` | — |
| 嵌套目录 | — | `includeNestedMemory` | — |
| 自动记忆 | — | `includeAutoMemory` + `autoMemoryDirectory` | — |

- **兼容映射**：`providerName`（默认 `claude-code`）是注册到 `ctx.skills` 的提供器唯一名；`claudeHome`（`$CLAUDE_CONFIG_DIR`、`$CLAUDE_HOME` 或 `~/.claude`）是要扫描 `skills`、`CLAUDE.md` 与 `projects` 的 Claude Code 主目录；项目根由 `projectRootMarkers`（默认 `['.git']`）识别。
- **两套语义不同，不要互相套用**：本插件按 Claude Code 的规则展开 `@import`（`maxImportDepth` 默认 4）；harness 的 `agent-instructions` 不展开 `@import`、有 1 MiB 上限、按同目录去重。这正是那两个字要由本插件独占的原因——接管把它们收敛到 Claude Code 的规则上，代价是剥段落依赖对方的消息格式（见 [decisions.md](decisions.md)）。
- **写入方向**：`memoryWrite` 默认 `false`，且必须先开启 `memory`，才允许模型调用 `claude_memory_write` 写入 Claude 项目自动记忆目录。
- **`.claude/rules/**` 与 `.claude/skills` 不是一回事**：前者走 `rules` 开关做作用域规则折入，后者走 `skills` 开关进会话技能目录。

## 不变量与开关同步

- 剥段落靠匹配工作区加载器写出的四种标题（`Instructions from:` / `Additional instructions from:` / `Updated instructions from:` / `Instructions removed:`）。宿主那侧格式一变，剥离静默失效，同一份 `CLAUDE.md` 会被本插件与工作区加载器各注入一次；`tests/rules-composition.spec.ts` 的组合用例就是这条不变量（按部署的注册顺序：本插件在前，作为启动时注册的 host 行，对手是从懒挂载的 agent preset 注册的加载器）。
- `takeOverClaudeMd: false` 可整个关掉接管，把这两个名字交回工作区加载器。
- 设置页四个开关（技能 / 记忆加载 / 记忆写入 / 规则）各自做什么、何时生效，由 `src/client/locales.ts` 的词条与 `ContextInjectionSection.tsx` 的 `COMPAT_SWITCHES` 共同决定；**加了能力就要同步这两处**，否则 UI 会继续按老清单描述。开关的保存反馈见 [settings-ui.md](settings-ui.md)。
