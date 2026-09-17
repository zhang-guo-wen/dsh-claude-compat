# AGENTS.md

本仓 `dsh-claude-compat` 是**独立于 harness monorepo** 的 DeepSeek Harness (DSH) 插件：
提供 Claude Code / Codex 兼容(skills、rules、`/btw`)与「Claude 兼容」设置页。
MCP 管理是另一个仓(`@zhang-guo-wen/dsh-mcp-manager`),见下。
它不打包 `@deepseek-ai/*`,运行时从宿主 harness 解析这些包。

## 目录

仓库根**就是**包:`package.json` 即 `@zhang-guo-wen/dsh-claude-compat`。
这不是风格选择——`dsh plugin add <git-url>` 取的是仓库根,包放在 `packages/*` 下会被装成错误的东西。

- `src/` —— host 入口 `index.ts`;浏览器半边在 `src/client/`。
- `lib/` —— 构建产物:**已提交进仓库**(`index.mjs` host + `client.js` 浏览器 handoff),
  这样别人可以直接从 git 安装。改完源码**记得 `npm run build` 并把 `lib/` 一起提交**。
- `cordis.patch.yml` —— 把插件行插入组合的 bundle 层。
- `docs/implementation.md` —— 实现说明(设计理念、源码地图、Model Experience)。
  它与根 `README.md`(面向使用者)内容不同,扁平化时从旧的包内 `README.md` 保留下来。

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

## MCP 管理已拆分

MCP 服务器管理(行的增删改、加载模式、工具过滤、「MCP 管理」设置页区块)是**独立的插件仓**
`@zhang-guo-wen/dsh-mcp-manager`(`../dsh-mcp-manager`)。本仓不再包含任何 MCP 代码,也不注册 Typert Remote。

两边的关系:

- **设置命名空间分开**:`context-injection`(本仓:`claude` / `codex` / `systemPrompt`)与
  `mcp-manager`(那边:`loading` / `descriptions` / `tools`)。settings 服务一个命名空间只有一个 registrant,
  共用做不到,所以拆分时把 MCP 三项搬到了新命名空间并去掉了 `mcp` 前缀。
- **设置页两个独立区块**:本仓 order 13「Claude 兼容」,那边 order 14「MCP 管理」。
- 本仓 client 半边**不再 mount 任何 Remote**;`/btw` 只读 `ctx.remote.session`(harness 提供)。
- 两边互不 import、互不依赖,可以单独安装与卸载。

MCP 的维护知识(MCP 行编写、延迟加载、预加载闸门、工具过滤、工具选择 UI、JSON 兼容)全部搬到了那边的
`AGENTS.md`。

## 部署

用官方命令安装,它把参数转发给 profile 目录里的 pnpm,**并自行维护 profile 清单**(依赖与 `dsh.profile.bundles` 一起加):

```sh
dsh plugin --profile web add C:/02-codespace/deepseek-harness/dsh-claude-compat   # 本地开发
dsh plugin --profile web add github:zhang-guo-wen/dsh-claude-compat               # git 源
```

本地目录安装时 pnpm 建的是 **symlink(记作 `link:`)** —— 所以重建 `lib/` 后**重启即生效,无需重装**。
`file:` 依赖则可能退化成物理拷贝,那时改源码不会影响正在跑的 dsh,要重装或手动同步 `lib/`。
client 产物变了还要强刷浏览器(或 bump `HANDOFF_ID`)。

## 发版(Release)

`lib/` 是提交进仓库的,所以**发版 = 改版本号 + 构建 + 提交产物 + 打 tag**。别人按 tag 安装,
`master` 上的临时提交不会被他们拿到。

1. 改根 `package.json` 的 `version`。
2. `npm run build`,确认 `lib/index.mjs` 与 `lib/client.js` 是最新。
3. 提交源码与 `lib/`(不要把 `lib/` 落在外面的工作区)。
4. 打带注释的 tag 并推送:

   ```sh
   git tag -a v<version> -m "dsh-claude-compat <version>"
   git push origin master --follow-tags
   ```

5. 验证安装(仓库根即包,不再需要 `path:` 参数):

   ```sh
   dsh plugin --profile web add \
     "git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git#v<version>"
   ```

## 易崩清单

1. `ctx.x` 属性访问未 inject 的服务 → 抛错(用 `ctx.get('x')`)。
2. client 包不是 `window.__ModuleLoader__.load` 格式 → 浏览器加载失败。
3. CSS module 里 JSX 引用但 CSS 未定义的类 → `undefined`,静默无样式(改样式后核对类名齐全)。
4. 改 client 不 bump `HANDOFF_ID` / 不硬刷新 → 浏览器跑旧 bundle(表现为"改动没生效/开关不变")。
5. **自造 message source kind → 用过的会话以后打不开。** `MessageSourceMap` 是可合并扩展的,但 Session 格式
   的 V2→V3 迁移只认发布版能产出的那张固定 kind 表(`session-format-v2-to-v3/src/payload.ts` 的
   `SOURCE_KINDS`),遇到不认识的 kind 会**拒绝迁移整份会话**("cannot safely transform unclassified message
   source; source v2 artifact remains unchanged")。harness 明确否决过"让插件注册迁移"的方案(那会让历史可读性
   依赖部署)。第三方包一律用**通用 `plugin` kind**:`{ kind: 'plugin', plugin: '<包名>#<loader>', form: ... }`
   —— 见 `src/sources.ts`。实测代价:本插件旧版写入的 `claude-code`/`codex` 两个 kind 让 **60 个 v2 会话里
   的 46 个全部无法打开**(v3 会话不受影响,因为 v3 不走迁移)。
