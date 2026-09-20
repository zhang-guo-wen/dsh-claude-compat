/**
 * Context-injection settings section dictionaries.
 *
 * Every switch names what it loads and when, so the page answers "which Claude
 * Code rules are compatible?" without reading the README. Each key of the
 * Chinese dictionary is part of {@link ContextInjectionSectionKey}, and `en` is
 * typed against it, so a new entry cannot ship untranslated.
 *
 * @module @zhang-guo-wen/dsh-claude-compat/client/locales
 */

/** Locale namespace owned by this plugin. */
export const NS = 'settings.contextInjection'

const zh = {
  'nav': 'Claude 兼容',
  'intro': '把 Claude Code 的技能、记忆文件与作用域规则注入会话。三项各自独立开关，默认全开。',
  'switchSection': '加载开关',
  'skills': '加载技能',
  'skills.desc': '把项目与全局的 Claude Code 技能加进会话技能目录',
  'skills.entry': '技能目录',
  'skills.entry.detail': '.claude/skills/**、~/.claude/skills/** —— 会话开始时进入技能目录，模型按名调用',
  'memory': '加载记忆',
  'memory.desc': '把 Claude Code 的 CLAUDE.md 记忆文件与自动记忆注入会话',
  'memory.files': '记忆文件',
  'memory.files.detail': '托管策略 CLAUDE.md、~/.claude/CLAUDE.md、项目根到工作目录每一层的 CLAUDE.md、.claude/CLAUDE.md 与 CLAUDE.local.md —— 会话开始时注入一次，这些文件由本插件加载，不走工作区指令加载器',
  'memory.auto': '自动记忆',
  'memory.auto.detail': '~/.claude/projects/<仓库>/memory/MEMORY.md 的前 200 行或 25KB —— 会话开始时注入一次，只读',
  'memory.nested': '子目录记忆',
  'memory.nested.detail': '读到某个目录下的文件后，注入该目录的 CLAUDE.md、.claude/CLAUDE.md 与 CLAUDE.local.md',
  'memory.imports': '@ 导入',
  'memory.imports.detail': '记忆文件里的 @路径 就地展开，最多 4 跳；代码块与行内代码里的不展开',
  'rules': '加载规则',
  'rules.desc': '折叠 .claude/rules/** 作用域规则',
  'rules.entry': '作用域规则',
  'rules.entry.detail': '.claude/rules/**、~/.claude/rules/** —— 不带 paths 的会话开始时注入，带 paths 的在读到匹配文件后注入',
  'unavailable': '设置当前不可用',
}
/** Key union, sourced from the Chinese dictionary. */
export type ContextInjectionSectionKey = keyof typeof zh

const en: Record<ContextInjectionSectionKey, string> = {
  'nav': 'Claude Compat',
  'intro': 'Fold Claude Code skills, memory files, and scoped rules into the session. Each of the three has its own switch, and all are on by default.',
  'switchSection': 'Loading switches',
  'skills': 'Load skills',
  'skills.desc': 'Add project and global Claude Code skills to the session skill catalog',
  'skills.entry': 'Skill roots',
  'skills.entry.detail': '.claude/skills/**, ~/.claude/skills/** — added to the skill catalog at session start; the model invokes them by name',
  'memory': 'Load memory',
  'memory.desc': 'Fold the Claude Code CLAUDE.md memory files and auto memory into the session',
  'memory.files': 'Memory files',
  'memory.files.detail': 'Managed policy CLAUDE.md, ~/.claude/CLAUDE.md, and CLAUDE.md, .claude/CLAUDE.md, and CLAUDE.local.md in every directory from the project root to the working directory — folded once at session start; this plugin loads them, not the workspace instruction loader',
  'memory.auto': 'Auto memory',
  'memory.auto.detail': 'The first 200 lines or 25 KB of ~/.claude/projects/<repo>/memory/MEMORY.md — folded once at session start; read-only',
  'memory.nested': 'Nested memory',
  'memory.nested.detail': "A directory's CLAUDE.md, .claude/CLAUDE.md, and CLAUDE.local.md, folded after a read reaches a file under it",
  'memory.imports': '@ imports',
  'memory.imports.detail': '@path references inside a memory file expand in place, up to 4 hops; code spans and fenced code blocks are left alone',
  'rules': 'Load rules',
  'rules.desc': 'Fold the .claude/rules/** scoped rules',
  'rules.entry': 'Scoped rules',
  'rules.entry.detail': '.claude/rules/**, ~/.claude/rules/** — rules without paths fold at session start; a paths: rule folds after a read matching it',
  'unavailable': 'Setting currently unavailable',
}

export { zh, en }
