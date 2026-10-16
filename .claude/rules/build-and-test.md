---
paths:
  - "package.json"
  - "tsconfig.json"
  - "tsdown.config.ts"
  - "build-client.mjs"
  - "vitest.config.ts"
  - "vitest.harness.config.ts"
  - "tests/**"
  - "lib/**"
---

覆盖什么、何时读：`npm run build` 的两段打包（tsdown / rolldown）与 TC39 装饰器降级，以及 specs 在姊妹 Harness checkout 里的两种跑法与各自覆盖范围。改构建配置、改 host/client 入口，或在验收前确认该跑哪套测试时读我。

# 构建与验证(specs)

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

## 验证(specs)

specs 在**姊妹 Harness checkout** 里跑(那个目录才有 `vitest`),从 checkout 根执行:

```sh
node_modules/.bin/vitest run --root dsh-claude-compat                                   # 自足子集
node_modules/.bin/vitest run --root dsh-claude-compat --config vitest.harness.config.ts # 全量 7 套
```

全量配置用 checkout 的 `tsconfig.base.json` paths 解析 `@deepseek-ai/*`、从 checkout 的 pnpm store 解析
React,所以装载 `dsh-agent-loop` 的真实组合用例与组件渲染用例都能跑;自足子集只用本包 `node_modules`
里已装的包,且只收 `*.spec.ts`。`tests/README.md` 列出两者各自覆盖的套件。

设置页四个开关(技能 / 记忆加载 / 记忆写入 / 规则)各自做什么、何时生效,由 `src/client/locales.ts` 的词条与
`ContextInjectionSection.tsx` 的 `COMPAT_SWITCHES` 共同决定;**加了能力就要同步这两处**,
否则 UI 会继续按老清单描述。
