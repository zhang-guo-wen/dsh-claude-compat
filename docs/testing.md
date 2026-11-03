---
description: "@guowenzhang/dsh-claude-compat 的行为验证记录：每次验证的环境绑定、产物哈希、逐项读数与未覆盖项。"
kind: "package-reference"
---

# 行为验证记录

本页回答一个问题：**每个结论各自被什么证据支持、怎么复现。**
**没跑过的结论不写成本页的结论**；失败、未覆盖与受阻项如实保留。
读数必须绑定产物哈希：重建 `lib/` 之后旧读数不再是结论。

生成：`node tools/testing/record.mjs dsh-claude-compat --title "<行为>" [--run <证据 json>] [--instance <test-instance.json>]`

## 1、发版 1.3.1：bundle 安装顺序守卫（2026-11-03，产物 `72AB7BA3` / `B97A1D46`）

### 环境与产物绑定

| 项 | 值 |
|---|---|
| 日期 | 2026-11-03T22:11:15+08:00 |
| 插件 | @guowenzhang/dsh-claude-compat@1.3.1（HEAD 2599e56，工作树 3 项未提交） |
| 宿主 | （未绑定隔离实例；如为源码内验证请写明） |
| DSH_HOME | （未绑定） |
| 端口 / URL | （未绑定） |
| Node | v24.12.0 |
| lib/index.mjs | `72ab7ba3a325f791958643234cb1df68485bf7d844dfba973ea3d2958220d190`（62755 字节，2026-11-03T14:11:12.171Z） |
| lib/client.js | `b97a1d466d5ea8bbc903b8cbbb762cbfc50465e5019903a9c3c5cc1d1b2fe190`（23021 字节，2026-11-03T14:11:12.267Z） |
| 证据文件 | `.scratch/test-system/runs/2026-11-03-221112-dsh-claude-compat.json` |

### 车道结果

| 车道 | 状态 | 退出码 | 耗时 |
|---|---|---|---|
| typecheck | passed | 0 | 1.0s |
| build | passed | 0 | 0.6s |
| metadata | passed | 0 | 0.4s |

### 逐项读数

- `npm run typecheck`：`tsc --noEmit -p tsconfig.json`，退出码 0（lanes 车道 `typecheck` passed，1.0s）。
- `npm run build`：tsdown（host）+ rolldown（ModuleLoader handoff），退出码 0；产物 `lib/index.mjs` 62755 字节、`lib/client.js` 23021 字节，SHA256 见上表。重建使 CSS module 类名前缀由 `dVyNsG_` 变为 `gwIBsa_`（构建机路径参与哈希），CSS 规则与导出键集合未变。
- `npm run test:metadata`：2 项通过、0 失败；其中 `bundle patch defers to an earlier row that already mounts this plugin` 直接断言本次改动的 `cordis.patch.yml`（`disabled: !!js [...ctx.loader.entries()].some(...)`）。
- 本次分发内容变化：`cordis.patch.yml`（+安装顺序守卫）与重建后的 `lib/`；`lib/index.mjs` 与上一发布版本经 CRLF→LF 归一后逐字节一致。

### 本节未覆盖

- **harness 全量车道未通过、未记为通过**：`node tools/testing/lanes.mjs dsh-claude-compat --lanes harness` 于 2026-11-03 22:05 失败于配置解析——`vitest.harness.config.ts` 硬编码 `import { … } from '../vitest.shared.ts'`，要求插件目录的父目录就是 Harness checkout；本工作区 checkout 位于 `deepseekharness/`（插件父目录是工作区根），`C:\02-codespace\DeepSeek\vitest.shared.ts` 不存在，报 `[UNRESOLVED_IMPORT] Could not resolve '../vitest.shared.ts'`。
- 用 `.scratch/lane-root` 镜像布局重试全量：5/7 套、79 项通过，2 个组合套件在导入 Harness 源码时抛 `TypeError: Cannot read properties of undefined (reading 'UNLOADING')`（`deepseekharness/packages/core/agent-loop/src/index.ts:41`）。该失败与本次 `cordis.patch.yml` 改动无直接关系，但**不能当作通过**，故全量 harness 仍记为未覆盖。
- `unit` 车道 blocked：本包不安装 `vitest`（设计如此），自足子集也依赖 checkout 的 tsconfig paths 解析，本工作区布局下不可跑。
- 未做隔离实例安装验收：本次发布后没有在隔离 Harness 实例里装载并实测设置页与规则接管。

---
