覆盖什么、何时读：六条已知易崩点（`ctx.x` 属性访问、client 包格式、CSS module 类名、浏览器跑旧 bundle、自造 message source kind、剥段落依赖宿主消息格式）及其症状与实测代价。动手改 host/client、样式或消息源之前先读我。

# 易崩清单

1. `ctx.x` 属性访问未 inject 的服务 → 抛错(用 `ctx.get('x')`)。
2. client 包不是 `window.__ModuleLoader__.load` 格式 → 浏览器加载失败。
3. CSS module 里 JSX 引用但 CSS 未定义的类 → `undefined`,静默无样式(改样式后核对类名齐全)。
4. **改了 client 但浏览器仍跑旧 bundle** → `HANDOFF_ID` 必须等于包名,不能拿它当 revision(改它会让启动图找不到该插件);
   宿主按内容 revision 提供 bundle,重建 `lib/` 后硬刷新页面即可(表现为"改动没生效/开关不变")。
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
