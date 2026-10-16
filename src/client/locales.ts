/**
 * Context-injection settings section dictionaries.
 *
 * The page shows one switch per part of the compatibility surface: a label, one
 * line, and under it the labels of what it loads beside the paths it reads and a
 * one-line hint. The line under a label describes **the state the switch is in**
 * — what it loads while it is on, and what its off state does while it is off —
 * so the two never appear together. Copy is deliberately terse and each kind of
 * line has its own ceiling: an entry hint stays within {@link MAX_HINT_LENGTH}
 * characters, a switch line (`.on` / `.off`) within {@link MAX_LINE_LENGTH}, and
 * the one footer line within {@link MAX_FOOTNOTE_LENGTH};
 * `tests/context-injection-section.spec.tsx` holds every entry to its ceiling.
 * Nothing on this page is hover-only.
 *
 * Each key of the Chinese dictionary is part of
 * {@link ContextInjectionSectionKey}, and `en` is typed against it, so a new
 * entry cannot ship untranslated.
 *
 * @module @guowenzhang/dsh-claude-compat/client/locales
 */

/** Locale namespace owned by this plugin. */
export const NS = 'settings.contextInjection'

/** Longest an entry hint (`.hint`) may be, in characters. */
export const MAX_HINT_LENGTH = 48
/** Longest a switch line (`.on` / `.off`) may be, in characters. */
export const MAX_LINE_LENGTH = 120
/** Longest the footer line (`footer`) may be, in characters. */
export const MAX_FOOTNOTE_LENGTH = 120

const zh = {
  'nav': 'Claude 兼容',
  'skills': '加载技能',
  'skills.on': '把项目与全局的 Claude Code 技能加进会话技能目录',
  'skills.entry': '技能目录',
  'skills.entry.hint': '会话开始时进入，模型按名调用',
  'prompts': '加载记忆',
  'prompts.on': '把 Claude Code 的 CLAUDE.md 记忆文件注入会话（≤4 MiB/文件、≤4 跳、≤256 KiB/批）',
  'prompts.off': '关闭后 CLAUDE.md 交回工作区指令加载器（1 MiB、不展开 @）',
  'prompts.files': '记忆文件',
  'prompts.files.hint': '会话开始时注入一次',
  'prompts.nested': '子目录记忆',
  'prompts.nested.hint': '读到该目录下的文件后注入',
  'prompts.imports': '@ 导入',
  'prompts.imports.hint': '工作目录外的路径也直接展开，不询问',
  'autoMemory': '加载自动记忆',
  'autoMemory.on': '把 Claude Code 的自动记忆索引注入会话（取前 200 行或 25 KB）',
  'autoMemory.entry': '自动记忆',
  'autoMemory.entry.hint': '会话开始时注入，只读',
  'memoryWrite': '写入记忆',
  'memoryWrite.on': '允许模型把新记忆写入项目自动记忆目录（同名不覆盖；索引满 200 行或 25 KB 后拒绝新增）',
  'memoryWrite.entry': '话题文件与索引',
  'memoryWrite.entry.hint': '创建话题文件并追加索引指针',
  'rules': '加载规则',
  'rules.on': '折叠 .claude/rules/** 作用域规则（单文件 1 MiB、整批 256 KiB）',
  'rules.entry': '作用域规则',
  'rules.entry.hint': '不带 paths 下个请求折入，带 paths 读到匹配文件后折入',
  'footer': '改动在下一个请求生效；已注入的内容不会撤回，本会话已折过的那批也不会补入 —— 建议新建会话',
  'saving': '保存中…',
  'saved': '已保存',
  'saveFailed': '开关未生效：',
  'retry': '重试',
  'unavailable': '设置当前不可用',
  'unavailableHint': '这个部署没有挂载 claude-compat 设置命名空间。确认插件行已在 profile 里启用（这五个开关由插件行的 Config 提供）。',
}
/** Key union, sourced from the Chinese dictionary. */
export type ContextInjectionSectionKey = keyof typeof zh

const en: Record<ContextInjectionSectionKey, string> = {
  'nav': 'Claude Compat',
  'skills': 'Load skills',
  'skills.on': 'Add project and global skills to the session',
  'skills.entry': 'Skill roots',
  'skills.entry.hint': 'Catalogued at start, invoked by name',
  'prompts': 'Load memory',
  'prompts.on': 'Fold CLAUDE.md memory files into the session (≤4 MiB/file, ≤4 hops, ≤256 KiB/batch)',
  'prompts.off': 'Off hands CLAUDE.md back to the workspace loader (1 MiB, no @ expansion)',
  'prompts.files': 'Memory files',
  'prompts.files.hint': 'Folded once at session start',
  'prompts.nested': 'Nested memory',
  'prompts.nested.hint': 'Folded after a read under the directory',
  'prompts.imports': '@ imports',
  'prompts.imports.hint': 'Outside paths expand too, without asking',
  'autoMemory': 'Load auto memory',
  'autoMemory.on': 'Fold the auto-memory index into the session (first 200 lines or 25 KB)',
  'autoMemory.entry': 'Auto memory',
  'autoMemory.entry.hint': 'Folded once at session start, read-only',
  'memoryWrite': 'Write memory',
  'memoryWrite.on': 'Let the model write new memories (never overwrites; index stops at 200 lines or 25 KB)',
  'memoryWrite.entry': 'Topic files and index',
  'memoryWrite.entry.hint': 'Creates a topic file and indexes it',
  'rules': 'Load rules',
  'rules.on': 'Fold the .claude/rules/** scoped rules (1 MiB per file, 256 KiB per batch)',
  'rules.entry': 'Scoped rules',
  'rules.entry.hint': 'Folds next request, or after a matching read',
  'footer': 'Changes apply on the next request; folded content is not withdrawn or folded again — start a new session',
  'saving': 'Saving…',
  'saved': 'Saved',
  'saveFailed': 'The switch did not take effect:',
  'retry': 'Retry',
  'unavailable': 'Setting currently unavailable',
  'unavailableHint': 'This deployment does not mount the claude-compat settings namespace. Check that the plugin row is enabled in the profile: these five switches come from that row’s Config.',
}

export { zh, en }
