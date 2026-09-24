# AGENTS.md

本仓 `dsh-claude-compat` 是**独立于 harness monorepo** 的 DeepSeek Harness (DSH) 插件：
提供 Claude Code 兼容(技能发现、记忆文件、作用域规则)与「Claude 兼容」设置页。
MCP 管理是另一个仓(`@guowenzhang/dsh-mcp-manager`),见下。
它不打包 `@deepseek-ai/*`,运行时从宿主 harness 解析这些包。

## 目录

仓库根**就是**包:`package.json` 即 `@guowenzhang/dsh-claude-compat`。
这不是风格选择——`dsh plugin add <git-url>` 取的是仓库根,包放在 `packages/*` 下会被装成错误的东西。

- `src/` —— host 入口 `index.ts`;浏览器半边在 `src/client/`。
  Claude 记忆文件（位置、`@import` 展开、自动记忆）在 `src/memory.ts`,折叠时机在 `src/instructions.ts`;
  共享的文件读取与项目根上溯在 `src/file-text.ts`,共用的 `Instructions from:` 渲染在 `src/render.ts`。
- **`CLAUDE.md` / `CLAUDE.local.md` 由本插件独占。** 这两个名字 harness 的
  `agent-instructions` 也会读(不展开 `@import`、1 MiB 上限、同目录去重),所以 `src/instructions.ts`
  在每个 `agent/pre-step` 里把该加载器消息中这两个名字的段落剥掉(`Instructions from:` /
  `Additional instructions from:` / `Updated instructions from:` / `Instructions removed:` 四种标题)。
  改 harness 那侧的渲染格式会让剥离静默失效,`tests/rules-composition.spec.ts` 的组合用例就是这条不变量。
  `takeOverClaudeMd: false` 可整个关掉接管。
- `lib/` —— 构建产物:**已提交进仓库**(`index.mjs` host + `client.js` 浏览器 handoff),
  这样别人可以直接从 git 安装。改完源码**记得 `npm run build` 并把 `lib/` 一起提交**。
- `cordis.patch.yml` —— 把插件行插入组合的 bundle 层。
- `docs/implementation.md` —— 实现说明(设计理念、源码地图、Model Experience)。
  它与根 `README.md`(面向使用者)内容不同,扁平化时从旧的包内 `README.md` 保留下来。

## 配置

每个字段都有可用的默认值,下表用于覆盖其中某一项。`skills`、`rules`、`memory` 同时各有设置页开关,所以用户不动组合就能关掉其中一块;组合想换起点,就在行的 `config:` 下写同样的字段,schema 默认值在它之下。

| 字段 | 默认 | 含义 |
|---|---|---|
| `providerName` | `claude-code` | 注册到 `ctx.skills` 的提供器唯一名 |
| `claudeHome` | `$CLAUDE_CONFIG_DIR`、`$CLAUDE_HOME` 或 `~/.claude` | Claude Code 主目录,扫描 `skills`、`CLAUDE.md` 与 `projects` |
| `projectRootMarkers` | `['.git']` | 用来识别项目根的目录项 |
| `skills` | `true` | 把 `.claude/skills` 根加进会话技能目录 |
| `includeProjectRoot` / `includeGlobalRoot` | `true` | 扫描项目 / 用户的 `.claude/skills` 根 |
| `memory` | `true` | 把 Claude Code 记忆文件折进请求 |
| `includeProjectRule` / `includeGlobalRule` | `true` | 加载项目 / 用户的 `CLAUDE.md` 记忆文件 |
| `includeManagedMemory` | `true` | 加载机器级托管策略记忆文件 |
| `managedMemoryPath` | 各平台策略路径 | 要加载的托管策略记忆文件 |
| `includeNestedMemory` | `true` | 读到某目录下的文件后加载该目录的记忆文件 |
| `includeAutoMemory` | `true` | 加载自动记忆索引 `MEMORY.md` |
| `autoMemoryDirectory` | 由仓库路径推导 | 改用指定的自动记忆目录 |
| `takeOverClaudeMd` | `true` | 独占 `CLAUDE.md`/`CLAUDE.local.md`:由本插件加载,并从工作区指令加载器中剥掉 |
| `maxMemorySourceBytes` | `4194304` | 单个记忆文件最多读取的 UTF-8 字节 |
| `maxMemoryRenderBytes` | `262144` | 单批记忆最多渲染的 UTF-8 字节 |
| `maxImportDepth` | `4` | 单个记忆文件最多跟随的 `@path` 导入跳数 |
| `rules` | `true` | 把 `.claude/rules/**` 作用域规则折进请求 |
| `includeProjectRules` / `includeGlobalRules` | `true` | 折入项目 / 用户的 `.claude/rules/**` 树 |
| `maxRuleSourceBytes` | `1048576` | 单个规则文件最多读取的 UTF-8 字节 |
| `maxRuleRenderBytes` | `262144` | 单批规则最多渲染的 UTF-8 字节 |

```yaml
- name: '@guowenzhang/dsh-claude-compat'
  config:
    skills: true
    memory: true
    rules: false
```

三个开关是插件行 Config 上的 `Volatile` 字段:设置页写入的值不经过重挂载就到达运行中的插件,contributor 每次请求现读它们。

## 验证(specs)

specs 在**姊妹 Harness checkout** 里跑(那个目录才有 `vitest`),从 checkout 根执行:

```sh
node_modules/.bin/vitest run --root dsh-claude-compat                                   # 自足子集
node_modules/.bin/vitest run --root dsh-claude-compat --config vitest.harness.config.ts # 全量 6 套
```

全量配置用 checkout 的 `tsconfig.base.json` paths 解析 `@deepseek-ai/*`、从 checkout 的 pnpm store 解析
React,所以装载 `dsh-agent-loop` 的真实组合用例与组件渲染用例都能跑;自足子集只用本包 `node_modules`
里已装的包,且只收 `*.spec.ts`。`tests/README.md` 列出两者各自覆盖的套件。

设置页三个开关(技能 / 记忆 / 规则)各自加载什么、何时注入,由 `src/client/locales.ts` 的词条与
`ContextInjectionSection.tsx` 的 `COMPAT_SWITCHES` 共同决定;**加了能力就要同步这两处**,
否则 UI 会继续按老清单描述。

## 构建

`npm run build` 跑两段打包:

- host:`tsdown` 打 `src/index.ts` → `lib/index.mjs`,所有 `@deepseek-ai/*` 保持 external。
- client:`build-client.mjs`(rolldown)→ `lib/client.js`,包成 `window.__ModuleLoader__.load({ id, factory })`,
  react / `@deepseek-ai/*` external,`.module.css` 用 lightningcss 编译并内联。

**Node 不解析 TC39 装饰器。** tsdown 默认不降级装饰器,所以 `tsdown.config.ts` 里有一个
`lowerDecorators` transform(用 `typescript` 的 `transpileModule`),对含 `@装饰器` 的文件在打包前降级。
少了它,`@Remote` 会以原始语法留在 `lib/index.mjs`,host 加载即崩。

```sh
npm run build      # host（tsdown）+ client（rolldown ModuleLoader handoff）
npm run typecheck
```

## 插件契约(Cordis)

- host 插件导出 `{ name, inject, apply }`;`apply(ctx, config)` 里注册能力,注册一律走 `ctx.effect(...)` 收口。
- 依赖的服务用 `ctx.get('x')` 取,**不要** `ctx.x` 属性访问 —— 未 inject 的服务属性在 Cordis 的 inject guard 下会抛错。
- client 半边必须打成 `window.__ModuleLoader__.load({ id, factory })` 手接格式;id 与 `build-client.mjs`
  里的 `HANDOFF_ID` 一致。改动 client 后要 bump 它或强刷浏览器,否则浏览器一直跑旧 bundle。

## 组合接线（cordis.patch.yml）

`cordis.patch.yml` 把插件行插入组合的 bundle 层:

```yaml
- insert:
    - id: claude-compat
      name: '@guowenzhang/dsh-claude-compat'
```

`package.json` 的 `dsh` 字段声明它在 profile 里的接线:`dsh.bundle.patch` 指向上面这个补丁文件,`dsh.client.inject` 列出浏览器半边挂载时要用到的宿主 client 包:

```json
"dsh": {
  "client": {
    "inject": [
      "@deepseek-ai/dsh-api-gateway",
      "@deepseek-ai/dsh-client-store",
      "@deepseek-ai/dsh-client-ui-settings",
      "@deepseek-ai/dsh-client-locale",
      "@deepseek-ai/dsh-client-ui-slots",
      "@deepseek-ai/dsh-client-ui-renderer"
    ],
    "platform": "web"
  },
  "bundle": {
    "patch": "./cordis.patch.yml"
  }
}
```

行 id 是 `claude-compat`:它同时是设置页寻址的命名空间、host 插件导出的 `name`,以及 `CLAUDE.md`/`CLAUDE.local.md` 接管所依赖的那一行。

## MCP 管理已拆分

MCP 服务器管理(行的增删改、加载模式、工具过滤、「MCP 管理」设置页区块)是**独立的插件仓**
`@guowenzhang/dsh-mcp-manager`(`../dsh-mcp-manager`)。本仓不再包含任何 MCP 代码,也不注册 Typert Remote。

两边的关系:

- **设置命名空间分开**:`context-injection`(本仓:`skills` / `memory` / `rules`)与
  `mcp-manager`(那边:`loading` / `descriptions` / `tools`)。settings 服务一个命名空间只有一个 registrant,
  共用做不到,所以拆分时把 MCP 三项搬到了新命名空间并去掉了 `mcp` 前缀。
- **设置页两个独立区块**:本仓 order 13「Claude 兼容」,那边 order 14「MCP 管理」。
- 本仓 client 半边**不 mount 任何 Remote**,只注册字典与设置区块,不需要 `remote` / `workspaces`。
- 两边互不 import、互不依赖,可以单独安装与卸载。

MCP 的维护知识(MCP 行编写、延迟加载、预加载闸门、工具过滤、工具选择 UI、JSON 兼容)全部搬到了那边的
`AGENTS.md`。

## 安装

四个变体,全部走官方命令;它把参数转发给 profile 目录里的 pnpm,**并自行维护 profile 清单**(依赖与 `dsh.profile.bundles` 一起加,不要手写):

```sh
# npm 官方源
npx @deepseek-ai/dsh plugin --profile web add @guowenzhang/dsh-claude-compat

# HTTPS
npx @deepseek-ai/dsh plugin --profile web add git+https://github.com/zhang-guo-wen/dsh-claude-compat.git

# SSH
npx @deepseek-ai/dsh plugin --profile web add git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git

# 锁定发布 tag,默认分支上后续的临时提交不会被拉到
npx @deepseek-ai/dsh plugin --profile web add "git+ssh://git@github.com/zhang-guo-wen/dsh-claude-compat.git#v0.2.0"

# 本地目录开发安装,pnpm 建 symlink,重建 lib/ 后重启即生效,无需重装
npx @deepseek-ai/dsh plugin --profile web add /absolute/path/to/dsh-claude-compat
```

`lib/` 已提交进仓库,所以装完即可运行,**使用者不需要构建**。

卸载时依赖条目与 bundle 层一起移除:

```sh
npx @deepseek-ai/dsh plugin --profile web remove @guowenzhang/dsh-claude-compat
```

装完重启宿主,再打开设置页:

```sh
npx @deepseek-ai/dsh web
```

## 部署

用官方命令安装,它把参数转发给 profile 目录里的 pnpm,**并自行维护 profile 清单**(依赖与 `dsh.profile.bundles` 一起加):

```sh
dsh plugin --profile web add C:/02-codespace/deepseek-harness/dsh-claude-compat   # 本地开发
dsh plugin --profile web add github:zhang-guo-wen/dsh-claude-compat               # git 源
```

本地目录安装时 pnpm 建的是 **symlink(记作 `link:`)** —— 所以重建 `lib/` 后**重启即生效,无需重装**。
`file:` 依赖则可能退化成物理拷贝,那时改源码不会影响正在跑的 dsh,要重装或手动同步 `lib/`。
client 产物变了还要强刷浏览器(或 bump `HANDOFF_ID`)。

生效语义分两半。**host 半边是进程内模块**:重建 `lib/` 不会替换正在运行的代码,必须重启宿主才会加载新产物。**client 半边按内容 revision 提供**:刷新页面就能拿到新 bundle,`HANDOFF_ID` 就是这个 revision 的标识,改动 client 后必须 bump 它或强刷浏览器,否则浏览器一直跑旧 bundle。

三个设置页开关是插件行的 `Volatile` 字段,所以它们不属于上面这条重启规则:设置页写入的值不经过重挂载就到达运行中的插件。

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

## 技术决策

- **仓库根就是包,不放进 `packages/*`** —— `dsh plugin add <git-url>` 取的是仓库根,放进子目录会被装成错误的东西(见「目录」)。
- **`CLAUDE.md`/`CLAUDE.local.md` 由本插件独占,而不是让两个加载器并存** —— 这两个名字 harness 的 `agent-instructions` 也会读,但规则不同(不展开 `@import`、1 MiB 上限、同目录去重);接管把这两个名字收敛到 Claude Code 的规则上,代价是剥段落依赖对方的消息格式(见「易崩清单」第 6 条)。
- **三个开关做成插件行的 `Volatile` 字段,而不是另开一个 settings 命名空间** —— settings 服务一个命名空间只有一个 registrant(见「MCP 管理已拆分」),放在行 Config 上则设置页写入不需要重挂载。
- **消息源一律用通用 `plugin` kind,不自造 kind** —— Session 格式迁移只认发布版能产出的那张固定 kind 表,自造 kind 会让历史会话打不开;harness 明确否决过"让插件注册迁移"的方案(见「易崩清单」第 5 条)。

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
6. **接管依赖工作区加载器的消息格式 → 两个加载器各注入一份。** 剥掉 `CLAUDE.md`/`CLAUDE.local.md`
   段落,靠匹配该加载器写出的 `Instructions from:` / `Additional instructions from:` /
   `Updated instructions from:` / `Instructions removed:` 四种标题。宿主那侧的格式一变,自有段落就不再
   被剥掉,同一份 `CLAUDE.md` 会被本插件与工作区加载器各注入一次;`tests/rules-composition.spec.ts`
   的组合用例就是这条不变量(按部署的注册顺序:本插件在前,作为启动时注册的 host 行,对手是从懒挂载的
   agent preset 注册的加载器)。`takeOverClaudeMd: false` 可整个关掉接管,把这两个名字交回工作区加载器。
