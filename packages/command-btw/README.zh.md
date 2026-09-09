---
description: "一个 /btw 命令，它分叉一个可继续对话的子代理来回答旁路问题，供选择、组合或调试继承上下文的子任务分叉的用户与维护者使用。"
kind: "package-reference"
---

# @deepseek-ai/dsh-command-btw

[English](README.md) | 中文

## 摘要

`dsh-command-btw` 让用户把 Claude Code 的 "by the way" 旁路问题作为自己的子任务提出：输入 `/btw` 加一个问题，harness 就会**分叉一个可继续对话的子代理**来作答。子代理继承父会话已完成的回合前缀作为初始上下文，因此能看到父会话讨论过的内容，并且它作为**独立的子任务会话**运行，你可以打开并与其继续对话。父会话只记录 `/btw` 已启动并显示简短确认；问题和答案不是父会话的模型可见消息。分叉要求完全平衡的历史——当回合仍打开，或任何回合尚未完成时会被拒绝。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与待办工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

用户可以直接从 Web 客户端提出旁路问题：`/btw` 命令随标准 `dsh` base 提供，并使用 `fork` 子代理提供方分叉出一个子任务会话。自定义应用要获得同一命令，需一起挂载命令注册表、带可继续分叉提供方的 `subagents` 服务、会话投影注册表与本插件。

### `/btw` 命令

输入 `/btw` 加一个问题并发送。harness 分叉一个可继续对话的子代理，把问题作为子代理的初始提示词投递，并记录一个 `btw/spawn` 事件指明子会话：

| 输入 | 结果 |
|---|---|
| `/btw what language is this project?` | 分叉一个子代理；父会话显示 `Started /btw as child session {id}.` |
| `/btw` | 用法错误：`A question is required. Usage: /btw <question>`。仅空白输入计为空。 |
| 超过 `maxQuestionBytes` 的问题 | 一个指出字节上限的错误。 |
| 父回合仍打开时 `/btw` | 一个要求等待平衡历史的错误。 |
| 任何回合完成前 `/btw` | 一个要求先完成一个回合的错误。 |

周围的空白会被裁剪，但问题本身会原样保留，并逐字记录到仅日志的 `btw/spawn` 事件中。

命令的默认值是部署策略：

| 配置字段 | 类型 | 默认值 | 含义 |
|---|---|---|---|
| `maxQuestionBytes` | 正整数 | `4096` | 旁路问题的最大 UTF-8 字节数。 |
| `provider` | 字符串 | `fork` | 必须支持可继续子代理的 `ctx.subagents` 分叉提供方名。 |

### 组合该命令

```yaml
- id: commands
  name: '@deepseek-ai/dsh-commands'
- id: session-projection
  name: '@deepseek-ai/dsh-session-projection'
- id: subagents
  name: '@deepseek-ai/dsh-subagent'
- id: subagent-fork-in-process
  name: '@deepseek-ai/dsh-subagent-fork-in-process'
  config:
    providerName: fork
- id: command-btw
  name: '@deepseek-ai/dsh-command-btw'
  config:
    maxQuestionBytes: 4096
    provider: fork
```

Web 客户端自带该命令。headless 模式、ACP 自动化和 JSON-RPC 不提供斜杠命令，因此 `/btw` 在那里不可用。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部 —— 点击展开</summary>

### 设计概念

命令本身不回答问题。它用配置的分叉提供方在 `ctx.subagents` 上分叉一个可继续对话的子代理，该提供方会用父会话已完成的回合前缀作为 seed 播种子代理。子代理从此拥有自己的回合，因此父会话与子会话相互独立，答案在子会话中。父会话只记录一个携带子 id 的仅日志 `btw/spawn` 事件，因此父会话的 `session.deriveMessages()` 不变。

### 如何分叉子代理

handler 校验问题，检查父会话处于平衡状态（无打开回合且至少完成一个回合），确认提供方已注册且支持可继续子代理，然后调用 `ctx.subagents.startContinuable`。在 inbox 接受后记录 `btw/spawn`，并返回简短确认。子代理的答案与任何后续对话都留在子会话中，绝不会作为父会话的模型消息呈现。

### 源码映射

| 文件 | 职责 |
|---|---|
| [`src/index.ts`](src/index.ts) | 插件入口：`btw/spawn` 事件声明、`forkBtw` handler、`/btw` 命令注册、配置校验 |
| — | 未发布运行时不变量伴随文件；每个 `btw/spawn` 都是独立的仅日志记录，没有跨事件或可变数据关系。 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

当包级契约不够时，阅读以下页面。它们涵盖本命令依赖的命令注册表、子代理分叉能力与会话历史投影。

- [dsh-commands](../../interaction/commands/README.zh.md) —— 发现全局命令及其 `recordInput` 语义的注册表。
- [dsh-subagent](../../subagent/subagent/README.zh.md) —— `ctx.subagents` 服务定义与可继续分叉能力。
- [dsh-subagent-fork-in-process](../../subagent/subagent-fork-in-process/README.zh.md) —— 用父会话已完成回合前缀播种子代理的分叉提供方。
- [会话投影子系统](../../../docs/subsystems/session.zh.md) —— `turnBoundary` 如何报告打开回合，`deriveMessages()` 如何折叠有序 surface。
- [context 组地图](../README.zh.md) —— 继承上下文的子任务命令在请求上下文插件旁的定位。

-----

<a id="model-experience"></a>
## 模型体验

### 人类 `/btw` 子任务分叉

#### 模型看到什么

父会话的模型永远不会看到旁路问题或答案。该命令分叉一个子代理，其自身模型请求看到父会话的已完成回合前缀加上作为子代理首个提示词的问题。父会话只记录 `btw/spawn`、`command/run` 与 `command/done` —— 均为仅日志 —— 因此父会话后续的 `request/header` 或 `deriveMessages()` 不包含该交换。

#### Token 影响

旁路问题消耗子代理自身回合的 token，而非父会话的。由于子代理复用父会话的已完成回合前缀，其首个请求符合对该前缀的提示词缓存复用条件。父会话后续回合的 token 数不变。

#### KV 缓存影响

子会话的上下文是独立会话，因此它不会使父会话的请求缓存失效。子代理自身请求可独立于父会话复用继承的前缀作为缓存。

## 已知限制与待办工作

<a id="known-limitations-and-deferred-work"></a>


这些限制界定了 `/btw` 不适用或行为与用户预期不同的地方。它们是当前包的约束，而非任务积压。

- **要求平衡历史** —— `/btw` 在父回合仍打开或任何回合完成前会拒绝，因此无法在任务进行中使用。
- **答案只在子会话中** —— 父会话不会将答案文本作为模型消息渲染；你必须打开子任务会话才能阅读。
- **已提供的入口点中仅 Web** —— headless 模式、ACP 自动化与 JSON-RPC 不提供命令适配器，因此 `/btw` 在那里不可用。
- **依赖可继续分叉提供方** —— 没有支持可继续子代理的 `ctx.subagents` 提供方的部署无法运行 `/btw`。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 —— 点击展开</summary>

本开发备注是维护者的工作上下文；它明确不具权威性。已发布的行为、限制与理由见上文各节与包代码。

- `btw/spawn` 事件携带 `childId` 与裁剪后的问题；客户端用该子 id 打开子任务会话。
- 确认文本与错误字符串由 [`tests/command-btw.spec.ts`](tests/command-btw.spec.ts) 固定；更改它们会改变用户可见输出。

</details>
