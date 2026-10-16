---
paths:
  - "src/**"
  - "cordis.patch.yml"
  - "package.json"
  - "lib/**"
---

覆盖什么、何时读：Cordis 插件契约（`{ name, inject, apply }`、`ctx.effect`、`ctx.get`）、client handoff 格式与 `HANDOFF_ID`，以及 `cordis.patch.yml` 与 `package.json` 的 `dsh` 字段如何接线。改 host/client 入口、动组合接线，或排查「插件没被加载 / 启动图找不到该插件」时读我。

# 插件契约(Cordis)与组合接线

## 插件契约(Cordis)

- host 插件导出 `{ name, inject, apply }`;`apply(ctx, config)` 里注册能力,注册一律走 `ctx.effect(...)` 收口。
- 依赖的服务用 `ctx.get('x')` 取,**不要** `ctx.x` 属性访问 —— 未 inject 的服务属性在 Cordis 的 inject guard 下会抛错。
- client 半边必须打成 `window.__ModuleLoader__.load({ id, factory })` 手接格式;`HANDOFF_ID` **必须始终等于包名** ——
  它是 handoff 身份(启动图按 id 找 factory),不是 revision,改它会让 Web 启动图找不到该插件。宿主按**内容 revision**
  提供 bundle,所以改完 client 用 `npm run build` 重建 `lib/` 即可,浏览器还跑到旧代码时硬刷新页面。

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
