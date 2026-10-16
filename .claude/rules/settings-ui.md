---
paths:
  - "src/client/**"
  - "src/context-injection.ts"
  - "src/index.ts"
  - "locale/**"
  - "tests/**"
---

覆盖什么、何时读：设置页五个开关的保存中 / 已保存 / 失败反馈机制、`ContextInjectionSection` 的界面几何与排版约定，以及覆盖它的测试。改设置页 UI、控制器保存路径或相关文案时读我。

# 设置页开关的写入反馈

五个开关的翻动是**异步写入**:`ContextInjectionController.toggle` await 配置表单的 `set`,并把每个
开关自己的写入状态发布进同一个快照(`ContextInjectionSectionState.saves`,键是 `InjectionSwitch`)。
**每个开关只写自己**——宿主侧没有任何开关依赖另一个(写入记忆不再要求先开启加载记忆),所以控制器里没有
`mutate` 原子写入分支。`ContextInjectionSection` 把状态渲染在**产生写入的那一行**里:

- `saving`:该开关自己 `disabled`(避免连点并发两次写入),行内显示「保存中…」;
- `saved`:不在行内渲染,由 `useEffect` 交给宿主的 `Toast` 浮层,文案是「已保存 · <开关名>」;
  控制器 2 秒后把该开关回落到 `idle`(定时器在 `dispose()` 里清掉);
- `failed`:行内显示 `saveFailed` + 宿主给的原因 + 重试按钮。**开关停在宿主已提交的值**(开关位置来自 Config 快照,
  `saves` 只影响这一行的提示),所以「重试」就是再 `toggle(name)` 一次,不需要额外的回滚。

失败不清空任何数据。设置页把"命名空间没挂载"的说明补成了 `unavailable` + `unavailableHint`(为什么不可用 + 去哪检查)。

## 页面文案：每个开关只有一行，而且写的是"当前状态"

页面**不写长解释**:没有顶部介绍卡片,**没有任何悬停才出现的内容**(触屏没有悬停)。每个开关行是

```
标签
一行说明            ← 写的是这个开关**当前状态**:开着=加载了什么+字节/跳数上限;
                      关掉(且该开关有 off 词条)=关掉后的结果。两者互斥,绝不并排出现。
                    [Switch]
  └ 加载项:标签 + 加载路径标签(宿主 Tag,tone neutral) + 一句提示
```

- `COMPAT_SWITCHES` 每条给 `on`(必填)与 `off`(可选)。渲染规则一行:
  `state[name] || off === undefined ? on : off`——**关闭时用 off 整行替换 on 行**,不叠加、不分两行。
  目前只有「加载记忆」(字段 `memory`)有 off 词条(`关闭后 CLAUDE.md 交回工作区指令加载器(1 MiB、不展开 @)`),
  因为只有它关掉后是另一套规则接管;其余四条关掉只是"不加载",off 留空、两态共用 on 行。
- 预算(4 MiB 单文件、256 KiB 整批、4 跳、200 行 25 KB、1 MiB 单文件)直接写进 on 行,**不放 title**。
- 页面底部一行 `footer`:`改动在下一个请求生效;已注入的内容不会撤回,本会话已折过的那批也不会补入 —— 建议新建会话`。
  它说的是**开关整体**的行为(中途补开无效、关掉不撤回),所以只能放在列表末尾,不能挂在任何单行上。

- 文案进 `src/client/locales.ts`;文件路径与 glob 是代码 token,直接写在 `ContextInjectionSection.tsx`
  的 `COMPAT_SWITCHES` 里、按宿主读取的原样显示,不进字典、不翻译。
- **三档长度硬约束**:`.hint` ≤ `MAX_HINT_LENGTH`(48);`.on` / `.off` ≤ `MAX_LINE_LENGTH`(120);
  `footer` ≤ `MAX_FOOTNOTE_LENGTH`(120)。中英文各自逐条断言在
  `tests/context-injection-section.spec.tsx`。写文案先数长度再想措辞;英文比中文长,先按英文卡。
- 开关的 `title` 只留给"设置当前不可用"这一种禁用态,不承载任何内容文案。
- 页面顺序:`加载技能`、`加载记忆`(`memory`,CLAUDE.md 记忆文件)、`加载自动记忆`(`autoMemory`,MEMORY.md 索引)、
  `写入记忆`(`memoryWrite`)、`加载规则`(`rules`)。前两者是两条独立通路,`memoryWrite` 不依赖它们。

界面几何与排版同 `dsh-mcp-manager`:本包只贡献一个 `settings.section`,就地声明
`container: context-injection / inline-size` + `max-width: 760px`(BASELINE §3.3),**不套一级页面的 960px 内容列**;
字号一律 `font: var(--dsw-font-*)`;开关行是「标签+描述+提醒 | 开关」的两列,路径标签用 `flex-wrap` 换行,
长路径在标签内断行(`.compatPaths > span`),不撑破 560px 的桌面列;`footer` 用 0.5px 上边线与列表分隔;
`@media (pointer: coarse)` 把开关行抬到 44px。本页没有原生文本输入,所以没有 16px 手机输入规则。
整行点击做不到:开关是宿主 `Switch`(36×20 的 `button[role=switch]`),把 `div` 变成可点区域会违反
"不用 div 冒充按钮",所以只把行高抬到 44px。

`tests/context-injection-section.spec.tsx` 覆盖渲染与控制器行为(标签/状态行/路径/提示齐全、三档文案不超长、
开与关各自只出现自己那一行、静止态只有 footer 一个 `<p>`、五个开关互不影响、保存中 / 保存失败 + 重试、
失败不改开关值、成功提示 2 秒回落):静态渲染断言用 `renderToStaticMarkup`,"已保存进宿主浮层"那条用
`// @vitest-environment jsdom` + `react-dom/client` 挂载后断言浮层文案(SSR 不跑 effect,静态渲染看不到浮层)。
它渲染 React,只能在装有 React 的 Harness checkout 里跑(见 `tests/README.md`);本包没有 `npm test`,
验收是 `npm run test:metadata`。
