# AGENTS.md

本仓 `dsh-claude-compat` 是**独立于 harness monorepo** 的 DeepSeek Harness (DSH) 插件：
提供 Claude Code / Codex 兼容(skills、rules、`/btw`)、Harness 兼容设置页、以及 MCP 增删改。
它不打包 `@deepseek-ai/*`,运行时从宿主 harness 解析这些包。

## 目录

- `packages/claude-compat/src/` —— host 入口 `index.ts`;浏览器半边在 `src/client/`。
- `packages/claude-compat/lib/` —— 构建产物:**已提交进仓库**(`index.mjs` host + `client.js` 浏览器 handoff),
  这样别人可以直接从 git 安装。改完源码**记得 `npm run build` 并把 `lib/` 一起提交**。
- `packages/claude-compat/cordis.patch.yml` —— 把插件行插入组合的 bundle 层。
- `packages/claude-compat/src/remote.ts` —— 手写的客户端 `TYPERT_REMOTE` 贡献对象。

## 构建

`npm run build` 跑两段打包:

- host:`tsdown` 打 `src/index.ts` → `lib/index.mjs`,所有 `@deepseek-ai/*` 保持 external。
- client:`build-client.mjs`(rolldown)→ `lib/client.js`,包成 `window.__ModuleLoader__.load({ id, factory })`,
  react / `@deepseek-ai/*` external,`.module.css` 用 lightningcss 编译并内联。

**Node 不解析 TC39 装饰器。** tsdown 默认不降级装饰器,所以 `tsdown.config.ts` 里有一个
`lowerDecorators` transform(用 `typescript` 的 `transpileModule`),对含 `@装饰器` 的文件在打包前降级。
少了它,`@Remote` 会以原始语法留在 `lib/index.mjs`,host 加载即崩。

## 插件契约(Cordis)

- host 插件导出 `{ name, inject, apply }`;`apply(ctx, config)` 里注册能力,注册一律走 `ctx.effect(...)` 收口。
- 依赖的服务用 `ctx.get('x')` 取,**不要** `ctx.x` 属性访问 —— 未 inject 的服务属性在 Cordis 的 inject guard 下会抛错。
- client 半边必须打成 `window.__ModuleLoader__.load({ id, factory })` 手接格式;id 与 `build-client.mjs`
  里的 `HANDOFF_ID` 一致。改动 client 后要 bump 它或强刷浏览器,否则浏览器一直跑旧 bundle。

## Typert Remote(前后端通信)

host 侧:`class X extends TypertRemoteService`,构造里 `super(ctx, '<namespace>')`,方法加 `@Remote('name')`。
**无条件注册这个服务** —— 不要用 `if (ctx.get('loader') !== undefined)` 之类前置守卫,守卫为假时服务根本不注册,
客户端 RPC 会收到 HTTP 404。host 网关按服务方法的**运行时参数名**推导 invocation descriptor,
因此路由**不需要**生成的 `typert.host.js`。

client 侧:`await ctx.remote.$mount(TYPERT_REMOTE)`,之后用 `ctx.get('remote.<namespace>')` 调用。

- 客户端贡献对象是 `{ package, descriptors }`;`descriptors` 里每个参数/结果的 codec 必须 `mode: 'strict'`
  且带 `schema.parse`(可直接 `{ parse: v => v }`)。
- 它与 host 的 `typert.host.js` manifest(`{ package, face, schemas, model, invocations }`)是**两种不同形状**,不要混用。
- 独立包可以手写 `TYPERT_REMOTE` 走通这条通道,不必跑 typert 生成器(生成器要求 `tsconfig.host.json` +
  完整解析 `@deepseek-ai/*` 类型,在独立仓里代价高且易崩)。

## MCP 编写(本插件核心)

MCP 行有两种来源,更新路径不同:

- **全局**:改 file-backed Include;新增走 `loader.create`,本身**实时生效**。
- **preset(agent)**:写 preset 的 `agent.cordis.yml`。写完必须让**正在运行的 preset** 感知:
  - 首选:拿 standing mount 的 `Include` 树调 **`tree.refresh()`** —— 按差异增量增删,只动改动那一行,亚秒级。
  - 兜底:`agentPresets.standingKeyFor(id)` —— 整棵重组,会把 preset 里**所有** MCP 子进程重启,3-4 秒。

开关 MCP 时 UI 用**行级乐观状态**(`启动中`/`停止中`)+ 后台异步,不要锁整列表。
启用本质要等 MCP 子进程启动(`npx -y …` / `uvx …` 通常 1-3 秒),那是进程启动耗时,不是插件开销;
用直接可执行文件替代 `npx -y` 能显著缩短。

**关键坑:模块实例不共享。** 插件里 `import { livePresetMounts } from '@deepseek-ai/dsh-agent-presets'`
可能解析到**与 harness 使用的不一样的副本**(harness 从源码经 tsx 加载,插件拿到构建版 `lib/index.js`),
导致模块级状态为空(`livePresetMounts()` 返回 0),`refresh()` 形同虚设。要经 loader 的内部解析器取同一实例:

```ts
const mod = await ctx.loader.internal.import('@deepseek-ai/dsh-agent-presets', ctx.baseUrl, {}) as {
  livePresetMounts(): readonly { presetId: string; tree: { refresh?(): Promise<void> } }[]
}
const mount = mod.livePresetMounts().filter(m => m.presetId === id).at(-1)
await mount?.tree.refresh?.()
```

### 延迟加载(src/lazy-mcp.ts)

**加载方式(`mcpLoading`)是 `context-injection` 用户设置**(默认值取自 host 插件的 `Config`)**+ UI 三选一**,
不是 preset 行 —— 见下面的坑。三种取值:

- `eager`:不注册按需工具。
- `dynamic`(默认):`mcp_load` 把 mcp-client 挂进**调用方 agent 的作用域**,原生注册工具。
- `lazy`:**用 MCP SDK 直连、完全不注册工具**;`mcp_load` 把工具 schema 作为结果返回,模型用固定的
  `mcp_call` 代理调用 → **工具列表永不变,请求缓存前缀零失效**。

`mcp_list` / `mcp_load` / `mcp_unload`(lazy 另加 `mcp_call`)让一个会话**按需启动**某台 MCP,省掉工具 schema 的 token:

- 被**禁用**的 composition 行不挂载,所以它的工具不进目录 —— 这就是"待加载"的来源。
- `mcp_load` 走 **agent 作用域**:`exec.agent.ctx.plugin(mcpClientPlugin, config)`,实例随该会话销毁,
  注册的工具只进这个 agent 的层(所以一个会话加载的服务器不会漏到别的会话)。
- 工具定义用 `@deepseek-ai/dsh-tools` 的 `defineTool` + `ctx.tools.register(def)`;`register` 返回 disposer,
  注册必须包在 `ctx.effect` 里。`exec.agent` 是拿到当前 agent 的唯一途径(无 agent 时要拒绝执行)。
- mcp-client 的插件对象**经 loader 内部解析**取得(`ctx.loader.internal.import`),与组合用的是同一个模块实例,
  否则 `serverName` 预留(模块级状态)不共享,可能挂出重复实例。

**坑(实测):不要把注册放在 preset 作用域。** 曾把按需工具做成 preset 行(`inject: ['tools']`,在 preset 的
standing 作用域里 `ctx.tools.register`),结果 **preset 每 ~5 秒被重挂一次**(MCP 子进程反复重启)。
撤掉该行即恢复。所以注册落在 **host 平面**(插件 `apply` 时的 root ctx):`ctx.effect` 收口。

模式是**活的用户设置**:`registerContextInjection(ctx, config, onCommitted)` 把提交后的 flags 交给 host,
`onCommitted` 里先 `dispose()` 掉旧注册(连带停掉它启动的服务器)再按新模式注册 —— 交换对**所有会话的下一次
请求**生效。`parseMcpLoadingMode` 把无法识别的存量值收敛回 `dynamic`(设置文档是用户可编辑的,不能因为一个
拼错的值让提交失败)。UI 侧是 `ContextInjectionSection.tsx` 的 `McpLoadingPicker`(三个 radio),
读写 `context-injection` 的 `mcpLoading` 字段。

## MCP JSON 兼容

编辑器的 JSON 框接受多种写法,缺省要能推断:

- 省略 `type`:有 `command` → stdio;有 `url` → streamable-http。
- `{ "<name>": { … } }` 单键映射、`{ "mcpServers": { … } }` 包装 → 用 key 当 `serverName`(标题字段为空时)。
- 裸 spec `{ type, command, args }` → 从参数推断 `serverName`(如 `@upstash/context7-mcp` → `context7-mcp`)。

## 部署

插件装进 `~/.dsh/profiles/<name>/node_modules/@zhang-guo-wen/dsh-claude-compat`。
**注意:`file:` 依赖在 profile 里可能是物理拷贝而非 junction** —— 那时改源码/重建**不会**影响正在跑的 dsh。
要么重装依赖建成 junction,要么手动把新 `lib/` 同步进 profile。client 产物变了还要强刷浏览器(或 bump `HANDOFF_ID`)。

## 发版(Release)

`lib/` 是提交进仓库的,所以**发版 = 改版本号 + 构建 + 提交产物 + 打 tag**。别人按 tag 安装,
`master` 上的临时提交不会被他们拿到。

1. 改 `packages/claude-compat/package.json` 的 `version`。
2. `npm run build`,确认 `lib/index.mjs` 与 `lib/client.js` 是最新。
3. 提交源码与 `lib/`(不要把 `lib/` 落在外面的工作区)。
4. 打带注释的 tag 并推送:

   ```sh
   git tag -a v<version> -m "dsh-claude-compat <version>"
   git push origin master --follow-tags
   ```

5. 验证安装(子目录 + tag 组合,两步用 `&` 相连):

   ```sh
   npx @deepseek-ai/dsh plugin --profile web add \
     "git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git#v<version>&path:packages/claude-compat"
   ```

## 易崩清单

1. `@Remote` 装饰器没在构建期降级 → host 加载崩(Node 不解析装饰器)。
2. 服务被守卫条件挡住没注册 → 客户端 RPC 404。
3. `ctx.x` 属性访问未 inject 的服务 → 抛错(用 `ctx.get('x')`)。
4. client 包不是 `window.__ModuleLoader__.load` 格式 → 浏览器加载失败。
5. CSS module 里 JSX 引用但 CSS 未定义的类 → `undefined`,静默无样式(改样式后核对类名齐全)。
6. 改 client 不 bump `HANDOFF_ID` / 不硬刷新 → 浏览器跑旧 bundle(表现为"改动没生效/开关不变")。
7. 用 `standingKeyFor` 做实时更新 → 每次整棵重组、重启所有 MCP、3-4 秒。
8. 直接用模块级 `livePresetMounts` 而不经 loader 解析 → 模块实例不同、返回空、更新无效。
9. 编辑 preset 后不调 `tree.refresh()` → 文件写了但运行态不变、UI 开关不动。
