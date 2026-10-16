# dsh-claude-compat

[English](<README.md>) | 中文

## 背景

当前很多项目已经围绕 Claude Code 构建了 Skills、Rules、记忆等资源。本插件让 DeepSeek Harness 兼容这些历史项目，复用已有的技能、规则和记忆，也可写入新的记忆。可以与 Claude Code 同时使用，只需要维护一套资源，无需为两边分别迁移或复制。

插件列表的显示名称与介绍支持英文和中文，随 Harness 语言设置显示，英文为默认回退；英文名称为去掉 npm scope 的原包名，中文名称说明用途，安装仍使用不变的真实包名。

## 截图

**设置 → Claude 兼容**：五个开关分别控制加载技能、加载记忆、加载自动记忆、写入记忆和加载规则。每个开关只有一行说明，而且写的是**它当前状态**会怎样（开着时说明加载了什么与字节上限，关掉时说明关掉后的结果），下面列出加载项的标签、加载路径和一句简短提示；页面底部一行说明开关改动何时生效。

![Claude 兼容设置页](<docs/images/claude-compat-settings.png>)

## npm 安装

```sh
npx @deepseek-ai/dsh plugin --profile web add @guowenzhang/dsh-claude-compat
```

安装后重启 DSH，打开 **设置 → Claude 兼容**。使用其他 profile 时，将 `web` 替换为对应名称。

[npm 包](https://www.npmjs.com/package/@guowenzhang/dsh-claude-compat)

## 注意事项

- 加载技能、加载记忆、加载自动记忆和加载规则默认开启，写入记忆默认关闭。五个开关互不依赖：写入记忆不要求先开启任何加载。
- 开关改动在**下一个请求**生效：关掉加载不会撤回本会话已注入的内容，本会话已经折过的那一批也不会因为中途打开而补入（"加载记忆"与"加载自动记忆"是两条通路，中途补开任一条同样无效）。改完建议新建会话。
- 写入只新增不覆盖：同名话题文件不会被改写，`MEMORY.md` 到达 200 行或 25 KB 后拒绝再新增。
- 复用项目与用户的 `.claude` 资源；写入只在模型调用工具时发生，不会自动整理、覆盖或删除已有记忆。与 Claude Code 并行使用时，避免同时修改同一文件。
- 记忆不会实时跟随文件修改；修改后建议新建会话。子目录记忆和带 `paths` 的规则只在读取匹配文件后加载，写入或编辑不会触发。
- 不读取 Claude Code 的 `settings.json`；自定义记忆目录等选项需在本插件中配置。
- 记忆文件中的 `@路径` 导入会直接展开，不额外询问是否允许访问工作目录外的文件，请只加载可信项目。

## 暂不支持的功能

本插件暂不支持 Claude Code 的 **MCP 和 Hooks**。

MCP 配置导入可通过独立的 [MCP 管理插件](https://github.com/zhang-guo-wen/dsh-mcp-manager) 实现。该插件支持全局及 **Agent 级别（Agent 预设）** 的 MCP 管理，按不同 Agent 配置服务、按需加载和过滤工具，更加灵活。

## 许可

Apache License 2.0，见 [LICENSE](<LICENSE>)。包含源自 DeepSeek Harness 的 MIT 许可部分，见 [NOTICE](<NOTICE>)。本项目与 Claude Code 及其所有者无隶属或背书关系。
