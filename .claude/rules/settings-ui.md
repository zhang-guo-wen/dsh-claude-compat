---
paths:
  - "src/client/**"
  - "src/context-injection.ts"
  - "src/index.ts"
  - "locale/**"
  - "tests/**"
---

覆盖什么、何时读：设置页四个开关的保存中 / 已保存 / 失败反馈机制、`ContextInjectionSection` 的界面几何与排版约定，以及覆盖它的测试。改设置页 UI、控制器保存路径或相关文案时读我。

# 设置页开关的写入反馈

四个开关的翻动是**异步写入**:`ContextInjectionController.toggle` 现在 await 配置表单的 `set`/`mutate`,并把每个
开关自己的写入状态发布进同一个快照(`ContextInjectionSectionState.saves`,键是 `InjectionSwitch`)。
`ContextInjectionSection` 把它渲染在**产生写入的那一行**里:

- `saving`:该开关自己 `disabled`(避免连点并发两次写入),行内显示「保存中…」;
- `saved`:行内显示「已保存」,2 秒后自动回落到 `idle`(定时器在 `dispose()` 里清掉);
- `failed`:行内显示 `saveFailed` + 宿主给的原因 + 重试按钮。**开关停在宿主已提交的值**(开关位置来自 Config 快照,
  `saves` 只影响这一行的提示),所以「重试」就是再 `toggle(name)` 一次,不需要额外的回滚。

失败不清空任何数据;`memoryWrite` 依赖 `!memory` 与禁用态共用同一条 `disabled` 通路(`locked`)。设置页把
"命名空间没挂载"的说明补成了 `unavailable` + `unavailableHint`(为什么不可用 + 去哪检查)。

界面几何与排版同 `dsh-mcp-manager`:本包只贡献一个 `settings.section`,就地声明
`container: context-injection / inline-size` + `max-width: 760px`(BASELINE §3.3),**不套一级页面的 960px 内容列**;
字号一律 `font: var(--dsw-font-*)`;`@media (pointer: coarse)` 把开关行抬到 44px。本页没有原生文本输入,
所以没有 16px 手机输入规则。整行点击做不到:开关是宿主 `Switch`(36×20 的 `button[role=switch]`),
把 `div` 变成可点区域会违反"不用 div 冒充按钮",所以只把行高抬到 44px。

`tests/context-injection-section.spec.tsx` 覆盖三态渲染与控制器行为(保存中 / 已保存 / 保存失败 + 重试、
失败不改开关值、成功提示 2 秒回落),但它渲染 React,只能在装有 React 的 Harness checkout 里跑(见
`tests/README.md`);本包没有 `npm test`,验收是 `npm run test:metadata`。
