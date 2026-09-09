/**
 * Context-injection settings section dictionaries.
 * @module @deepseek-ai/dsh-client-ui-context-injection/locales
 */

/** Locale namespace owned by this plugin. */
export const NS = 'settings.contextInjection'

const zh = {
  'nav': 'Harness兼容',
  'tab.prompt': '提示词管理',
  'tab.mcp': 'MCP 管理',
  'prompt.intro': '默认加载 AGENTS.md、CLAUDE.md：会话开始时加载一次（项目根 + 全局），后续对文件的修改不会重复注入。',
  'systemPrompt.label': '系统提示词',
  'systemPrompt.hint': '这里的内容会作为 system 级别的提示词注入会话，默认留空；可嵌入固定规则与身份信息。',
  'systemPrompt.placeholder': '例如：你是资深工程师，优先用中文作答，遇到不确定的配置先查文档，不要臆断。',
  'switchSection': '加载开关',
  'claude': '加载 Claude 规则',
  'claude.desc': '把项目与全局的 Claude Code 规则与技能注入会话',
  'claude.files': '注入：.claude/CLAUDE.md、~/.claude/CLAUDE.md、.claude/skills/**、~/.claude/skills/**、.claude/rules/**、~/.claude/rules/**',
  'codex': '加载 Codex 规则',
  'codex.desc': '把项目与全局的 Codex 规则注入会话',
  'codex.files': '注入：.codex/AGENTS.md、~/.codex/AGENTS.md',
  'mcp.subtitle': '已加载的 MCP 服务器',
  'mcp.loading': '正在读取……',
  'mcp.error': '读取失败',
  'mcp.retry': '重试',
  'mcp.empty': '暂无已加载的 MCP 服务器',
  'mcp.scopeGlobal': '全局',
  'mcp.scopePreset': '预设',
  'mcp.descriptionPlaceholder': '添加描述',
  'mcp.descriptionLabel': 'MCP 描述',
  'mcp.status.disabled': '已禁用',
  'mcp.status.conditional': '条件启用',
  'mcp.status.configured': '已配置',
  'mcp.status.pending': '待加载',
  'mcp.status.loading': '加载中',
  'mcp.status.active': '运行中',
  'mcp.status.failed': '加载失败',
  'mcp.status.unloading': '卸载中',
  'unavailable': '设置当前不可用',
}
/** Key union, sourced from the Chinese dictionary. */
export type ContextInjectionSectionKey = keyof typeof zh

const en: Record<ContextInjectionSectionKey, string> = {
  'nav': 'Harness Compat',
  'tab.prompt': 'Prompt management',
  'tab.mcp': 'MCP management',
  'prompt.intro': 'AGENTS.md and CLAUDE.md load by default, once at session start (project root + global); later edits are not re-injected.',
  'systemPrompt.label': 'System prompt',
  'systemPrompt.hint': 'Content here is injected into the session at the system level; it defaults to empty. Embed fixed rules and identity.',
  'systemPrompt.placeholder': 'e.g. You are a senior engineer; answer in Chinese; check docs before guessing.',
  'switchSection': 'Loading switches',
  'claude': 'Load Claude rules',
  'claude.desc': 'Inject project and global Claude Code rules and skills into the session',
  'claude.files': 'Loads: .claude/CLAUDE.md, ~/.claude/CLAUDE.md, .claude/skills/**, ~/.claude/skills/**, .claude/rules/**, ~/.claude/rules/**',
  'codex': 'Load Codex rules',
  'codex.desc': 'Inject project and global Codex rules into the session',
  'codex.files': 'Loads: .codex/AGENTS.md, ~/.codex/AGENTS.md',
  'mcp.subtitle': 'Loaded MCP servers',
  'mcp.loading': 'Loading…',
  'mcp.error': 'Failed to read',
  'mcp.retry': 'Retry',
  'mcp.empty': 'No MCP servers loaded',
  'mcp.scopeGlobal': 'Global',
  'mcp.scopePreset': 'Preset',
  'mcp.descriptionPlaceholder': 'Add description',
  'mcp.descriptionLabel': 'MCP description',
  'mcp.status.disabled': 'Disabled',
  'mcp.status.conditional': 'Conditional',
  'mcp.status.configured': 'Configured',
  'mcp.status.pending': 'Pending',
  'mcp.status.loading': 'Loading',
  'mcp.status.active': 'Running',
  'mcp.status.failed': 'Failed to load',
  'mcp.status.unloading': 'Unloading',
  'unavailable': 'Setting currently unavailable',
}

export { zh, en }
