# dsh-claude-compat

[English](README.md) | 中文

一个**独立**的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）插件：让 harness 复用你已有的
**Claude Code / Codex** 配置，并在 Web 设置页里管理 MCP 服务器与提示词规则，不用再手改 YAML。

它不打包 `@deepseek-ai/*`，这些包在运行时从宿主 harness 解析。

## 截图

### MCP 管理 —— 列出全部已配置服务器，状态实时

每台 MCP 服务器都带作用域、描述与运行状态，可直接新增、编辑、启用、停用。改动立即作用于正在运行的 host，无需重启。
此处的服务器名已打码；作用域、状态与操作控件保持可见。

![MCP 管理](docs/mcp-list.png)

### MCP 管理 —— 新增或编辑服务器

粘贴 Claude 兼容的连接 JSON，保存时解析并校验，写错会报错而不是被存下来。

![MCP 编辑](docs/mcp-editor.png)

### 提示词管理 —— 系统提示词与规则开关

一个 system 级别的提示词输入框，加上 Claude 规则与 Codex 规则注入的总开关。

![提示词管理](docs/prompt-tab.png)

## 这个插件有什么用

- **MCP 管理。** 在设置页里新增、编辑、启停 MCP 服务器。全局行与各 preset 的行都会列出并显示实时状态。切换时显示
  短暂的 `启动中 / 停止中`，因为要等 MCP 子进程起来，列表不会因此卡住。
- **按需加载 MCP。** 停用的服务器不占任何开销。模型可调用 `mcp_list`、`mcp_load`、`mcp_unload`，**只为当前会话**
  启动某台服务器；已加载的工具不会漏到别的会话。三种加载模式在"工具列表稳定性"与"绑定质量"之间取舍，见下。
- **Claude Code 兼容。** 发现 `<root>/.claude/skills/**` 进会话技能目录；把 `.claude/CLAUDE.md` 与
  `~/.claude/CLAUDE.md` 折进首个请求；折入 `.claude/rules/**`，其中带 `paths:` 的规则会在你读取匹配文件后生效。
- **Codex 兼容。** 折入 `.codex/AGENTS.md` 与 `~/.codex/AGENTS.md`。
- **`/btw`。** 从当前会话分叉出的新会话里问一个侧边问题。分叉锚定在最后一个已完成的回合，所以回合进行中
  提问会从上一个已结束的回合分叉，新会话把父会话的已完成回合当作自己的历史。答案显示在输入框内的卡片里；
  答案落地后卡片自动收起，并归档那个分叉会话。

### MCP 加载模式

行上的启停开关与加载模式回答两个不同问题：开关决定**这台服务器能不能用**，模式决定**允许的服务器什么时候进上下文**。

| 模式 | 行为 |
|---|---|
| 全部加载（`eager`） | 允许的服务器在会话开始时就挂载，工具始终在请求里 |
| 动态插入（`dynamic`，默认） | 允许的服务器默认**不挂载**；`mcp_load` 把一台挂进调用方会话，工具随之加入请求 —— 绑定质量最好，但工具列表每次加载会变一次 |
| 惰性（`lazy`） | 允许的服务器默认**不挂载**；`mcp_load` 用 MCP SDK 直连且**不注册任何工具**，只返回工具 schema，模型通过固定的 `mcp_call` 代理调用 —— 工具列表永不变，请求缓存前缀零失效 |

在 **设置 → Harness 兼容 → MCP 管理 → MCP loading** 里选择。该选择存在用户的 `context-injection` 设置命名空间，
提交后**从下一个请求起对所有会话生效**。

在一个配了四台 MCP 服务器的 preset 上实测：`dynamic` 首个请求带 **29** 个工具（内置 + `mcp_list`/`mcp_load`/`mcp_unload`），
`eager` 带 **378** 个，其中 348 个是 MCP 工具。

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
npx @deepseek-ai/dsh plugin --profile web add "git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git#v0.1.3-alpha.1"
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

每个字段都有可用的默认值，下表用于覆盖其中某一项。标注了"设置页"的字段可以直接在界面上改。

| 字段 | 默认 | 含义 |
|---|---|---|
| `providerName` | `claude-code` | 注册到 `ctx.skills` 的提供器唯一名 |
| `claudeHome` | `$CLAUDE_HOME` 或 `~/.claude` | Claude Code 主目录，扫描 `skills` 与 `CLAUDE.md` |
| `codexHome` | `$CODEX_HOME` 或 `~/.codex` | Codex 主目录，扫描 `AGENTS.md` |
| `projectRootMarkers` | `['.git']` | 用来识别项目根的目录项 |
| `includeProjectRoot` / `includeGlobalRoot` | `true` | 扫描项目 / 用户的 `.claude/skills` 根 |
| `includeProjectRule` / `includeGlobalRule` | `true` | 加载项目 / 全局的 `CLAUDE.md` 规则 |
| `includeProjectRules` / `includeGlobalRules` | `true` | 折入项目 / 用户的 `.claude/rules/**` 树 |
| `maxRuleSourceBytes` | `1048576` | 单个规则文件最多读取的 UTF-8 字节 |
| `maxRuleRenderBytes` | `262144` | 单批规则最多渲染的 UTF-8 字节 |
| `claude` / `codex` | `true` | 规则注入总开关（设置页） |
| `mcpLoading` | `dynamic` | MCP 加载模式（设置页） |
| `maxQuestionBytes` | `4096` | `/btw` 侧边问题的最大 UTF-8 字节 |

```yaml
- name: '@zhang-guo-wen/dsh-claude-compat'
  config:
    mcpLoading: lazy
```

## 已知限制

- **没有技能监听器** —— `.claude/skills` 在列出目录时被发现；新增、改名、删除要等下一次发现。
- **规则每会话只折入一次** —— `.claude/CLAUDE.md`、`~/.claude/CLAUDE.md`、`.codex/AGENTS.md` 在首个请求时读取，
  会话中途的改动不会被重读。
- **带路径的规则只在 `read` 时触发** —— `write` / `edit` 不会激活它们。
- **启用 MCP 仍需等子进程自身启动**（`npx -y …` / `uvx …` 通常 1–3 秒）。界面不会卡住；把服务器装成直接可执行文件
  能明显缩短这个时间。

## 开发

构建方式、Cordis/Typert 插件契约与各种坑见 [AGENTS.md](AGENTS.md)。

```sh
npm run build      # host（tsdown）+ client（rolldown ModuleLoader handoff）
npm run typecheck
```

## 许可

Apache License 2.0 —— 见 [LICENSE](LICENSE)。本项目包含源自 DeepSeek Harness 的 MIT 许可部分，见 [NOTICE](NOTICE)。
与 Claude Code、Codex 及其所有者无隶属或背书关系。
