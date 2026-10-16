# AGENTS.md

本仓 `dsh-claude-compat` 是**独立于 harness monorepo** 的 DeepSeek Harness (DSH) 插件(独立 git 仓库,分支 `master`)：
提供 Claude Code 兼容(技能发现、记忆文件、作用域规则)与「Claude 兼容」设置页。
它不打包 `@deepseek-ai/*`,运行时从宿主 harness 解析这些包。
MCP 管理是另一个仓(`@guowenzhang/dsh-mcp-manager`),见 [.claude/rules/mcp-split.md](.claude/rules/mcp-split.md)。

## 目录

仓库根**就是**包:`package.json` 即 `@guowenzhang/dsh-claude-compat`。
这不是风格选择——`dsh plugin add <git-url>` 取的是仓库根,包放在 `packages/*` 下会被装成错误的东西。

- `src/` —— host 入口 `index.ts`;浏览器半边在 `src/client/`。
  Claude 记忆文件（位置、`@import` 展开、自动记忆）在 `src/memory.ts`,折叠时机在 `src/instructions.ts`;
  共享的文件读取与项目根上溯在 `src/file-text.ts`,共用的 `Instructions from:` 渲染在 `src/render.ts`;
  消息源在 `src/sources.ts`。
- `lib/` —— 构建产物:**已提交进仓库**(`index.mjs` host + `client.js` 浏览器 handoff),
  这样别人可以直接从 git 安装。改完源码**记得 `npm run build` 并把 `lib/` 一起提交**。
- `cordis.patch.yml` —— 把插件行插入组合的 bundle 层。
- `docs/implementation.md` —— 实现说明(设计理念、源码地图、Model Experience)。
  它与根 `README.md`(面向使用者)内容不同,扁平化时从旧的包内 `README.md` 保留下来。
- `.claude/rules/` —— 本文件的明细页,按 `paths:` 作用域**按需读取**;不随 npm 发布(`package.json` 的 `files` 未列它)。

## 构建、测试与验证命令

```sh
npm run build         # host（tsdown）+ client（rolldown ModuleLoader handoff）
npm run typecheck     # 类型检查,不生成文件
npm run test:metadata # 本包自己的验收脚本
```

本包**没有 `npm test`**:specs 在**姊妹 Harness checkout** 里跑(那个目录才有 `vitest`),从 checkout 根执行:

```sh
node_modules/.bin/vitest run --root dsh-claude-compat                                   # 自足子集
node_modules/.bin/vitest run --root dsh-claude-compat --config vitest.harness.config.ts # 全量 7 套
```

## 硬约束

1. **`CLAUDE.md` / `CLAUDE.local.md` 由本插件独占。** 这两个名字 harness 的 `agent-instructions` 也会读
   (规则不同),所以 `src/instructions.ts` 在每个 `agent/pre-step` 里把该加载器消息中这两个名字的段落剥掉。
   改 harness 那侧的渲染格式会让剥离静默失效。`takeOverClaudeMd: false` 可整个关掉接管。
   `.claude/skills` / 记忆文件（`CLAUDE.md`）/ 自动记忆索引 / `.claude/rules/**` 是 `skills` / `memory` / `autoMemory` /
   `rules` 四条独立通路,scope 各有自己的开关,不要并成一条;`memoryWrite` 是第五条独立开关,不依赖任何加载开关
   (见 [.claude/rules/rules-and-memory.md](.claude/rules/rules-and-memory.md))。
2. **依赖的服务用 `ctx.get('x')` 取,不要 `ctx.x` 属性访问** —— 未 inject 的服务属性在 Cordis 的 inject guard 下会抛错。
3. **client 半边必须打成 `window.__ModuleLoader__.load({ id, factory })` 格式**;`HANDOFF_ID` **必须始终等于包名** ——
   它是 handoff 身份(启动图按 id 找 factory),不是 revision,改它会让 Web 启动图找不到该插件。
4. **`lib/` 是提交进仓库的构建产物** —— 改完源码必须 `npm run build`,并把 `lib/` 与源码一起提交。
5. **消息源一律用通用 `plugin` kind,不自造 kind** —— Session 格式迁移只认发布版能产出的那张固定 kind 表,
   自造 kind 会让历史会话打不开(代价见 [.claude/rules/pitfalls.md](.claude/rules/pitfalls.md) 第 5 条)。
6. **Node 不解析 TC39 装饰器** —— `tsdown.config.ts` 的 `lowerDecorators` transform 不能删,
   否则 `@Remote` 会以原始语法留在 `lib/index.mjs`,host 加载即崩。
7. **五个设置页开关是插件行 Config 上的 `Volatile` 字段** —— 设置页写入的值不经过重挂载就到达运行中的插件,
   它们不属于「重建 `lib/` 后要重启宿主」那条规则。
8. **加了能力就要同步 `src/client/locales.ts` 的词条与 `ContextInjectionSection.tsx` 的 `COMPAT_SWITCHES`**,
   否则 UI 会继续按老清单描述。
9. **CSS module 里 JSX 引用但 CSS 未定义的类 → `undefined`,静默无样式** —— 改样式后核对类名齐全。
10. **浏览器界面两条红线**:可见文案一律进本包 `src/client/locales.ts` 的 typed 字典,代码里不写死用户可见字符串;
    颜色取 `--dsw-alias-*` 语义别名,不新写 `#hex`/`rgb()` 字面量(更高权威是工作区根 `AGENTS.md` 的「插件 UI 规范」)。

## 详细规则

明细放 `.claude/rules/`,**不再常驻**。本包按 Claude Code 作用域规则的语义加载它们:每个文件都带**非空 `paths:`**
frontmatter(项目根相对、正斜杠的 picomatch glob);只有 agent 用 `read` 读到匹配这些 glob 的文件后,才会在
**下一次请求**把这些规则折进上下文,每会话至多一次。**没有 `paths:`(或为空)的才是像 `CLAUDE.md` 那样每次
会话首次请求就注入的常驻规则** —— 所以下面每条都必须保留非空 `paths:`。(实现:`src/rules.ts` 的
`loadClaudeRules` + `parsePaths`,由 `agent/pre-step` 与 `tools/result` 两个监听器驱动;细节见
[.claude/rules/rules-and-memory.md](.claude/rules/rules-and-memory.md)。)

- [.claude/rules/rules-and-memory.md](.claude/rules/rules-and-memory.md)：`CLAUDE.md` 接管与 `agent/pre-step` 剥离、`@import` 展开、`.claude/rules/**` 折入与 scope 隔离。
- [.claude/rules/config.md](.claude/rules/config.md)：全部配置字段的默认值与含义、组合 `config:` 示例。
- [.claude/rules/build-and-test.md](.claude/rules/build-and-test.md)：两段打包(tsdown / rolldown)与装饰器降级;specs 两套配置各覆盖什么。
- [.claude/rules/plugin-contract.md](.claude/rules/plugin-contract.md)：Cordis 契约、`cordis.patch.yml` 接线、`package.json` 的 `dsh` 字段。
- [.claude/rules/install-deploy.md](.claude/rules/install-deploy.md)：安装/卸载五个变体、部署方式、`lib/` 生效语义。
- [.claude/rules/release.md](.claude/rules/release.md)：发版流程(改版本号 → 构建 → 提交含 `lib/` → 打带注释 tag)。
- [.claude/rules/settings-ui.md](.claude/rules/settings-ui.md)：设置页开关的保存中/已保存/失败反馈、页面几何与排版、对应测试。
- [.claude/rules/mcp-split.md](.claude/rules/mcp-split.md)：MCP 管理拆分后的设置命名空间、设置页区块与依赖边界。
- [.claude/rules/decisions.md](.claude/rules/decisions.md)：四条技术决策(根即包、`CLAUDE.md` 独占、`Volatile` 开关、通用 kind)及其理由。
- [.claude/rules/pitfalls.md](.claude/rules/pitfalls.md)：易崩清单六条,含自造 message source kind 让历史会话打不开的实测代价。
