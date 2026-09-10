import z from "@deepseek-ai/schemastery";
import { homedir } from "node:os";
import { access, constants, lstat, readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { isSkillName } from "@deepseek-ai/dsh-skill";
import { parse } from "yaml";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import picomatch from "picomatch/posix.js";
import { livePresetMounts } from "@deepseek-ai/dsh-agent-presets";
import { Remote, RemoteError, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { dump, load } from "js-yaml";
import { applyEntryPatches, entryListSchema } from "@deepseek-ai/cordis-plugin-include";
import { withFileLock, writeFileAtomic } from "@deepseek-ai/dsh-atomic-write";
//#region src/frontmatter.ts
/**
* Claude Code YAML frontmatter parsing shared by the skill and rule readers.
*
* Both `SKILL.md` and `.claude/rules/*.md` carry a leading `---`-fenced YAML
* block. This module strips and parses that block into a data object plus the
* remaining body, returning `undefined` when the file has no closing fence.
*
* @module @deepseek-ai/dsh-claude-compat/frontmatter
*/
/**
* Strip a leading YAML frontmatter block.
* @param raw - the raw file text.
* @returns the frontmatter data and the remaining body, or `undefined` when the
*   file has no closing `---` fence after the required `---` opening line.
*/
function parseYamlFrontmatter(raw) {
	const firstLineEnd = raw.indexOf("\n");
	if (firstLineEnd < 0) return void 0;
	if (raw.slice(0, firstLineEnd).replace(/\r$/, "") !== "---") return void 0;
	const start = firstLineEnd + 1;
	const closing = findClosingFrontmatter(raw, start);
	if (closing === void 0) return void 0;
	const yaml = raw.slice(start, closing.start);
	const parsed = parse(yaml);
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return void 0;
	return {
		data: parsed,
		body: raw.slice(closing.bodyStart)
	};
}
function findClosingFrontmatter(raw, start) {
	let lineStart = start;
	while (lineStart <= raw.length) {
		const nextNewline = raw.indexOf("\n", lineStart);
		const lineEnd = nextNewline < 0 ? raw.length : nextNewline;
		if (raw.slice(lineStart, lineEnd).replace(/\r$/, "") === "---") return {
			start: lineStart,
			bodyStart: nextNewline < 0 ? raw.length : nextNewline + 1
		};
		if (nextNewline < 0) return void 0;
		lineStart = nextNewline + 1;
	}
}
//#endregion
//#region src/parse.ts
/**
* Parse a Claude Code skill file into the registry shape.
* @param raw - the raw file text.
* @returns the parsed skill, or `undefined` when the file is not a valid skill.
*/
function parseClaudeSkill(raw) {
	const parsed = parseYamlFrontmatter(raw);
	if (parsed === void 0) return void 0;
	const name = stringField(parsed.data, "name");
	const description = stringField(parsed.data, "description");
	if (name === void 0 || description === void 0 || !isSkillName(name)) return void 0;
	const invocation = parseInvocation(parsed.data);
	return {
		name,
		description,
		...optionalString(parsed.data, "whenToUse"),
		invocation,
		...optionalMetadata(parsed.data),
		content: parsed.body.trim()
	};
}
function parseInvocation(data) {
	const disableModelInvocation = frontmatterBoolean(data, "disable-model-invocation");
	const userInvocable = frontmatterBoolean(data, "user-invocable");
	return {
		modelInvocable: disableModelInvocation !== true,
		userInvocable: userInvocable !== false
	};
}
function stringField(data, key) {
	const value = data[key];
	return typeof value === "string" && value.length > 0 ? value : void 0;
}
function optionalString(data, key) {
	const value = data[key];
	return typeof value === "string" && value.length > 0 ? { [key]: value } : {};
}
function optionalMetadata(data) {
	const value = data.metadata;
	if (typeof value === "object" && value !== null && !Array.isArray(value)) return { metadata: value };
	return {};
}
function frontmatterBoolean(data, key) {
	if (!Object.hasOwn(data, key)) return void 0;
	const value = data[key];
	if (typeof value === "boolean") return value;
	if (value === 1 || value === "1") return true;
	if (value === 0 || value === "0") return false;
	if (typeof value === "string") switch (value.toLowerCase()) {
		case "true":
		case "yes":
		case "on": return true;
		case "false":
		case "no":
		case "off": return false;
	}
}
//#endregion
//#region src/provider.ts
/**
* Claude Code skill provider: discovers `.claude/skills` from the project root
* and the user's `~/.claude` home and serves them through `ctx.skills`.
*
* Claude Code stores skills as `<root>/.claude/skills/<name>/SKILL.md` (or a
* flat `<name>.md`). This provider registers on the shared registry
* (`dsh-skill`) exactly like `skill-filesystem`, but scans the Claude roots;
* because it is one more provider, its candidates merge with every other skill
* source and the registry's rank order decides duplicate names.
*
* @module @deepseek-ai/dsh-claude-compat/provider
*/
/** Rank contributed by a project `.claude/skills` root, after project-agent roots. */
const PROJECT_CLAUDE_RANK = 250;
/** Rank contributed by a user `~/.claude/skills` root, after user-agent roots. */
const USER_CLAUDE_RANK = 550;
/** Local filesystem-backed provider for Claude Code skills. */
var ClaudeCodeSkillProvider = class {
	ctx;
	control;
	name;
	claudeHome;
	projectRootMarkers;
	includeProjectRoot;
	includeGlobalRoot;
	enabled;
	constructor(ctx, control, config = {}) {
		this.ctx = ctx;
		this.control = control;
		this.name = config.providerName ?? "claude-code";
		this.claudeHome = resolve(config.claudeHome ?? process.env.CLAUDE_HOME ?? join(homedir(), ".claude"));
		this.projectRootMarkers = config.projectRootMarkers ?? [".git"];
		this.includeProjectRoot = config.includeProjectRoot ?? true;
		this.includeGlobalRoot = config.includeGlobalRoot ?? true;
		this.enabled = config.enabled ?? (() => true);
	}
	async list(options) {
		if (!this.enabled()) return [];
		const roots = await this.roots(options.cwd);
		const candidates = [];
		for (const root of roots) for (const skill of await this.discoverRoot(root)) candidates.push(skill);
		return candidates;
	}
	async get(candidate, options) {
		const locator = candidate.locator;
		const raw = await this.readText(locator.path, options.signal);
		if (raw === void 0) return void 0;
		const parsed = parseClaudeSkill(raw);
		if (parsed === void 0) return void 0;
		return {
			name: parsed.name,
			description: parsed.description,
			...parsed.whenToUse !== void 0 ? { whenToUse: parsed.whenToUse } : {},
			invocation: parsed.invocation,
			source: candidate.source,
			provider: this.name,
			resourceBase: {
				kind: "directory",
				path: locator.directory
			},
			path: locator.path,
			...parsed.metadata !== void 0 ? { metadata: parsed.metadata } : {},
			content: parsed.content
		};
	}
	async roots(cwd) {
		const roots = [];
		if (this.includeProjectRoot && cwd !== void 0) {
			const projectRoot = await findProjectRoot$3(resolve(cwd), this.projectRootMarkers, this.ctx);
			roots.push({
				path: join(projectRoot, ".claude", "skills"),
				source: "project-claude",
				rank: PROJECT_CLAUDE_RANK
			});
		}
		if (this.includeGlobalRoot) roots.push({
			path: join(this.claudeHome, "skills"),
			source: "user-claude",
			rank: USER_CLAUDE_RANK
		});
		return roots;
	}
	async discoverRoot(root) {
		const entries = await listSkillRootEntries(root.path, this.ctx);
		const skills = [];
		for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
			const locator = entry.type === "directory" ? {
				path: join(entry.path, "SKILL.md"),
				directory: entry.path
			} : entry.type === "file" && entry.name.endsWith(".md") ? {
				path: entry.path,
				directory: root.path
			} : void 0;
			if (locator === void 0) continue;
			const raw = await this.readText(locator.path, void 0);
			if (raw === void 0) continue;
			const parsed = parseClaudeSkill(raw);
			if (parsed === void 0) continue;
			skills.push({
				name: parsed.name,
				description: parsed.description,
				...parsed.whenToUse !== void 0 ? { whenToUse: parsed.whenToUse } : {},
				invocation: parsed.invocation,
				provider: this.name,
				source: root.source,
				rank: root.rank,
				locator,
				resourceBase: {
					kind: "directory",
					path: locator.directory
				},
				path: locator.path,
				...parsed.metadata !== void 0 ? { metadata: parsed.metadata } : {}
			});
		}
		return skills;
	}
	async readText(path, signal) {
		signal?.throwIfAborted();
		const fs = this.ctx.get("fs");
		if (fs !== void 0) try {
			const target = await fs.resolve(path, signal === void 0 ? void 0 : { signal });
			signal?.throwIfAborted();
			const info = await fs.stat(target, signal);
			signal?.throwIfAborted();
			if (info === void 0 || info.type !== "file") return void 0;
			return await fs.readText(target, signal);
		} catch {
			signal?.throwIfAborted();
			return;
		}
		try {
			return await readFile(path, {
				encoding: "utf8",
				signal
			});
		} catch {
			signal?.throwIfAborted();
			return;
		}
	}
};
async function listSkillRootEntries(root, ctx) {
	const fs = ctx.get("fs");
	if (fs !== void 0) return await listSkillRootEntriesFromFileSystem(root, fs);
	return await listSkillRootEntriesFromNode(root);
}
async function listSkillRootEntriesFromFileSystem(root, fs) {
	try {
		const target = await fs.resolve(root);
		return (await fs.listDir(target)).map(entryFromFs);
	} catch {
		return [];
	}
}
function entryFromFs(entry) {
	return {
		name: entry.name,
		type: entry.type,
		path: entry.target.displayPath
	};
}
async function listSkillRootEntriesFromNode(root) {
	let entries;
	try {
		entries = await readdir(root, {
			withFileTypes: true,
			encoding: "utf8"
		});
	} catch {
		return [];
	}
	const result = [];
	for (const entry of entries) {
		let kind = "other";
		try {
			if (entry.isDirectory()) kind = "directory";
			else if (entry.isFile()) kind = "file";
			else if (entry.isSymbolicLink()) {
				const info = await stat(join(root, entry.name));
				kind = info.isDirectory() ? "directory" : info.isFile() ? "file" : "other";
			}
		} catch {
			kind = "other";
		}
		result.push({
			name: entry.name,
			type: kind,
			path: join(root, entry.name)
		});
	}
	return result;
}
/** Walk upward to the first directory containing a configured root marker. */
async function findProjectRoot$3(cwd, markers, ctx) {
	const fs = ctx.get("fs");
	let current = resolve(cwd);
	for (;;) {
		for (const marker of markers) if (await pathExists$3(join(current, marker), fs)) return current;
		const parent = dirname(current);
		if (parent === current) return resolve(cwd);
		current = parent;
	}
}
async function pathExists$3(path, fs) {
	if (fs !== void 0) try {
		const target = await fs.resolve(path);
		return await fs.stat(target) !== void 0;
	} catch {
		return false;
	}
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}
//#endregion
//#region src/instructions.ts
/**
* Claude Code instruction contributor.
*
* Claude Code keeps rules in `CLAUDE.md`: a project one at
* `<projectRoot>/.claude/CLAUDE.md` and a user-global one at `~/.claude/CLAUDE.md`.
* The harness's `agent-instructions` deliberately loads only same-directory
* candidate names (`AGENTS.md`, `CLAUDE.md`), so this package contributes these
* two Claude Code rule files as an additional instructions-form context, using
* its own message-source kind so the two loaders never manage each other's
* messages. It folds the content into the first request the same way
* `agent-instructions` does, and is model-visible through a `user` message.
*
* @module @deepseek-ai/dsh-claude-compat/instructions
*/
/**
* Discover and read the Claude Code rule files for a workspace.
* @param cwd - absolute session working directory.
* @param ctx - plugin context (uses `ctx.fs` when present).
* @param config - home, root markers, and which files to load.
* @returns the combined context, or `undefined` when no rule file loaded.
*/
async function loadClaudeInstructions(cwd, ctx, config = {}) {
	const claudeHome = resolve(config.claudeHome ?? process.env.CLAUDE_HOME ?? join(homedir(), ".claude"));
	const markers = config.projectRootMarkers ?? [".git"];
	const files = [];
	if (config.includeProjectRule !== false) {
		const projectRoot = await findProjectRoot$2(resolve(cwd), markers, ctx);
		const projectFile = await readRuleFile$2(join(projectRoot, ".claude", "CLAUDE.md"), ctx);
		if (projectFile !== void 0) files.push({
			absolutePath: projectFile.absolutePath,
			displayPath: ".claude/CLAUDE.md",
			content: projectFile.content
		});
	}
	if (config.includeGlobalRule !== false) {
		const globalFile = await readRuleFile$2(join(claudeHome, "CLAUDE.md"), ctx);
		if (globalFile !== void 0) files.push({
			absolutePath: globalFile.absolutePath,
			displayPath: "~/.claude/CLAUDE.md",
			content: globalFile.content
		});
	}
	if (files.length === 0) return void 0;
	return {
		text: files.map((file) => `Instructions from: ${file.displayPath}\n\n${file.content}`).join("\n\n"),
		files
	};
}
/** Fold the Claude rule context into an entering step, mirroring `agent-instructions`. */
function injectIntoFirstRequest(decision, context) {
	if (decision.kind === "reject") return decision;
	if (decision.messages.length === 0) return decision;
	return {
		...decision,
		messages: foldContext(decision.messages, context.text)
	};
}
/** Insert the injected instructions after the last admitted user message. */
function foldContext(messages, text) {
	const message = createUserMessage({
		content: [{
			type: "text",
			text
		}],
		source: {
			kind: "claude-code",
			form: "instructions"
		}
	});
	const lastIndex = messages.findLastIndex((m) => m.role === "user");
	if (lastIndex < 0) return [...messages, message];
	return messages.toSpliced(lastIndex + 1, 0, message);
}
/**
* Register the `agent/pre-step` listener that reads and folds Claude rule
* context, skipping entirely when `isEnabled()` is false.
* @param ctx - plugin context.
* @param config - home, root markers, and file selection.
* @param isEnabled - thunk returning whether Claude injection is currently on.
*/
function claudeInstructionListener(ctx, config = {}, isEnabled = () => true) {
	ctx.on("agent/pre-step", async ({ agent, signal }, next) => {
		const decision = await next();
		if (!isEnabled()) return decision;
		if (decision.kind === "reject") return decision;
		if (decision.messages.length === 0) return decision;
		const session = agent.session;
		if (session === void 0) return decision;
		if (session.snapshotEvents().some((event) => event.type === "user/message" && event.data.source.kind === "claude-code")) return decision;
		const cwd = session.header?.cwd;
		if (cwd === void 0) return decision;
		const context = await loadClaudeInstructions(cwd, ctx, config);
		signal.throwIfAborted();
		if (context === void 0) return decision;
		return injectIntoFirstRequest(decision, context);
	});
}
async function readRuleFile$2(path, ctx) {
	const fs = ctx.get("fs");
	if (fs !== void 0) return await readRuleFileFromFs$1(path, fs);
	try {
		return {
			absolutePath: path,
			content: await readFile(path, { encoding: "utf8" })
		};
	} catch {
		return;
	}
}
async function readRuleFileFromFs$1(path, fs) {
	try {
		const target = await fs.resolve(path);
		const info = await fs.stat(target);
		if (info === void 0 || info.type !== "file") return void 0;
		return {
			absolutePath: path,
			content: await fs.readText(target)
		};
	} catch {
		return;
	}
}
async function findProjectRoot$2(cwd, markers, ctx) {
	const fs = ctx.get("fs");
	let current = resolve(cwd);
	for (;;) {
		for (const marker of markers) if (await pathExists$2(join(current, marker), fs)) return current;
		const parent = dirname(current);
		if (parent === current) return resolve(cwd);
		current = parent;
	}
}
async function pathExists$2(path, fs) {
	if (fs !== void 0) try {
		const target = await fs.resolve(path);
		return await fs.stat(target) !== void 0;
	} catch {
		return false;
	}
	try {
		await readFile(path, { encoding: "utf8" });
		return true;
	} catch {
		return false;
	}
}
//#endregion
//#region src/codex.ts
/**
* Codex instruction contributor.
*
* Codex keeps its rules in `AGENTS.md`: a global one at `~/.codex/AGENTS.md`
* and a project-level one at `<projectRoot>/.codex/AGENTS.md`. Like the Claude
* contributor, this folds them into the first request as a `user` message under
* its own message-source kind (`codex`) so the `agent-instructions` inbox
* filters never manage these messages.
*
* @module @deepseek-ai/dsh-claude-compat/codex
*/
/**
* Discover and read the Codex rule files for a workspace.
* @param cwd - absolute session working directory.
* @param ctx - plugin context (uses `ctx.fs` when present).
* @param config - home, root markers, and which files to load.
* @returns the combined context, or `undefined` when no rule file loaded.
*/
async function loadCodexInstructions(cwd, ctx, config = {}) {
	const codexHome = resolve(config.codexHome ?? process.env.CODEX_HOME ?? join(homedir(), ".codex"));
	const markers = config.projectRootMarkers ?? [".git"];
	const files = [];
	if (config.includeProjectRule !== false) {
		const projectRoot = await findProjectRoot$1(resolve(cwd), markers, ctx);
		const projectFile = await readRuleFile$1(join(projectRoot, ".codex", "AGENTS.md"), ctx);
		if (projectFile !== void 0) files.push({
			absolutePath: projectFile.absolutePath,
			displayPath: ".codex/AGENTS.md",
			content: projectFile.content
		});
	}
	if (config.includeGlobalRule !== false) {
		const globalFile = await readRuleFile$1(join(codexHome, "AGENTS.md"), ctx);
		if (globalFile !== void 0) files.push({
			absolutePath: globalFile.absolutePath,
			displayPath: "~/.codex/AGENTS.md",
			content: globalFile.content
		});
	}
	if (files.length === 0) return void 0;
	return {
		text: files.map((file) => `Instructions from: ${file.displayPath}\n\n${file.content}`).join("\n\n"),
		files
	};
}
/** Fold the Codex rule context into an entering step, mirroring `agent-instructions`. */
function injectCodexIntoFirstRequest(decision, context) {
	if (decision.kind === "reject") return decision;
	if (decision.messages.length === 0) return decision;
	return {
		...decision,
		messages: foldCodexContext(decision.messages, context.text)
	};
}
/** Insert the injected instructions after the last admitted user message. */
function foldCodexContext(messages, text) {
	const message = createUserMessage({
		content: [{
			type: "text",
			text
		}],
		source: {
			kind: "codex",
			form: "instructions"
		}
	});
	const lastIndex = messages.findLastIndex((m) => m.role === "user");
	if (lastIndex < 0) return [...messages, message];
	return messages.toSpliced(lastIndex + 1, 0, message);
}
/**
* Register the `agent/pre-step` listener that reads and folds Codex rule
* context, skipping entirely when `isEnabled()` is false.
* @param ctx - plugin context.
* @param config - home, root markers, and file selection.
* @param isEnabled - thunk returning whether Codex injection is currently on.
*/
function codexInstructionListener(ctx, config = {}, isEnabled = () => true) {
	ctx.on("agent/pre-step", async ({ agent, signal }, next) => {
		const decision = await next();
		if (!isEnabled()) return decision;
		if (decision.kind === "reject") return decision;
		if (decision.messages.length === 0) return decision;
		const session = agent.session;
		if (session === void 0) return decision;
		if (session.snapshotEvents().some((event) => event.type === "user/message" && event.data.source.kind === "codex")) return decision;
		const cwd = session.header?.cwd;
		if (cwd === void 0) return decision;
		const context = await loadCodexInstructions(cwd, ctx, config);
		signal.throwIfAborted();
		if (context === void 0) return decision;
		return injectCodexIntoFirstRequest(decision, context);
	});
}
async function readRuleFile$1(path, ctx) {
	const fs = ctx.get("fs");
	if (fs !== void 0) return await readRuleFileFromFs(path, fs);
	try {
		return {
			absolutePath: path,
			content: await readFile(path, { encoding: "utf8" })
		};
	} catch {
		return;
	}
}
async function readRuleFileFromFs(path, fs) {
	try {
		const target = await fs.resolve(path);
		const info = await fs.stat(target);
		if (info === void 0 || info.type !== "file") return void 0;
		return {
			absolutePath: path,
			content: await fs.readText(target)
		};
	} catch {
		return;
	}
}
async function findProjectRoot$1(cwd, markers, ctx) {
	const fs = ctx.get("fs");
	let current = resolve(cwd);
	for (;;) {
		for (const marker of markers) if (await pathExists$1(join(current, marker), fs)) return current;
		const parent = dirname(current);
		if (parent === current) return resolve(cwd);
		current = parent;
	}
}
async function pathExists$1(path, fs) {
	if (fs !== void 0) try {
		const target = await fs.resolve(path);
		return await fs.stat(target) !== void 0;
	} catch {
		return false;
	}
	try {
		await readFile(path, { encoding: "utf8" });
		return true;
	} catch {
		return false;
	}
}
//#endregion
//#region src/rules.ts
/**
* Claude Code scoped-rule contributor.
*
* Claude Code keeps scoped rules as markdown files under `.claude/rules/**`
* (project) and `~/.claude/rules/**` (user). Each rule's YAML frontmatter may
* carry a `paths:` list of gitignore-style globs; a rule **without** `paths`
* loads unconditionally like `CLAUDE.md`, while a rule **with** `paths` loads
* only when the agent reads a file matching one of those globs. This module
* mirrors that behavior: it discovers the rule tree, parses `paths`, folds
* always-on rules into the first request, and folds path-scoped rules in when a
* matching file is read.
*
* The folded content reaches the model as one `user` message under its own
* `claude-rule` message-source kind, so the `agent-instructions` inbox filters
* (which match only `agent-instructions`) never manage these messages and the
* contributor never re-injects a rule already on the surfaced log.
*
* @module @deepseek-ai/dsh-claude-compat/rules
*/
/** The `read` tool name that drives path-scoped activation. */
const READ_TOOL_NAME = "read";
/** Default per-file UTF-8 byte cap; larger rule files are skipped. */
const DEFAULT_RULE_SOURCE_BYTES = 1048576;
/** Default aggregate UTF-8 byte cap for one injected rules batch. */
const DEFAULT_RULE_RENDER_BYTES = 262144;
/**
* Discover and read the Claude Code rule tree for a workspace.
* @param cwd - absolute session working directory.
* @param ctx - plugin context (uses `ctx.fs` when present).
* @param config - home, root markers, and file selection.
* @returns the discovered rules and the project root they were anchored to.
*/
async function loadClaudeRules(cwd, ctx, config = {}) {
	const claudeHome = resolve(config.claudeHome ?? process.env.CLAUDE_HOME ?? join(homedir(), ".claude"));
	const markers = config.projectRootMarkers ?? [".git"];
	const maxSourceBytes = config.maxRuleSourceBytes ?? DEFAULT_RULE_SOURCE_BYTES;
	const projectRoot = await findProjectRoot(resolve(cwd), markers, ctx);
	const rules = [];
	if (config.includeProjectRules !== false) {
		const projectDir = join(projectRoot, ".claude", "rules");
		for (const file of await walkRuleTree(projectDir, ctx)) {
			const rule = await readRuleFile(file, pathToPosix(relative(projectRoot, file)), maxSourceBytes, ctx);
			if (rule !== void 0) rules.push(rule);
		}
	}
	if (config.includeGlobalRules !== false) {
		const userDir = join(claudeHome, "rules");
		for (const file of await walkRuleTree(userDir, ctx)) {
			const rule = await readRuleFile(file, `~/.claude/rules/${pathToPosix(relative(userDir, file))}`, maxSourceBytes, ctx);
			if (rule !== void 0) rules.push(rule);
		}
	}
	return {
		rules,
		projectRoot
	};
}
/**
* Fold the given rule text into an entering step, mirroring `claude-instructions`.
*
* Unlike `claude-instructions`, a scoped rule may activate mid-turn after a
* matching read, at which point the entering step may carry no newly claimed
* messages. So an empty enter still receives the rules content; it is up to
* {@link selectRulesToInject} to keep always-on rules out of such steps.
*
* @param decision - the pre-step decision to amend.
* @param text - the rendered rule context to fold in.
* @returns the amended decision, or the original when it cannot be amended.
*/
function injectRulesIntoRequest(decision, text) {
	if (decision.kind === "reject") return decision;
	return {
		...decision,
		messages: foldRulesContext(decision.messages, text)
	};
}
/**
* Insert the injected rules after the last admitted user message.
* @param messages - the messages to amend.
* @param text - the rendered rule context to insert.
* @returns the amended message array.
*/
function foldRulesContext(messages, text) {
	const message = createUserMessage({
		content: [{
			type: "text",
			text
		}],
		source: {
			kind: "claude-rule",
			form: "instructions"
		}
	});
	const lastIndex = messages.findLastIndex((message) => message.role === "user");
	if (lastIndex < 0) return [...messages, message];
	return messages.toSpliced(lastIndex + 1, 0, message);
}
/**
* Render the rules to fold, honoring the aggregate render budget.
* @param rules - the rules to render, in model precedence order.
* @param maxBytes - aggregate UTF-8 byte cap; a non-positive value disables the cap.
* @returns the rendered text.
*/
function renderRules(rules, maxBytes) {
	const parts = [];
	let bytes = 0;
	for (const rule of rules) {
		const part = `Instructions from: ${rule.displayPath}\n\n${rule.content}`;
		const partBytes = byteLength((parts.length === 0 ? "" : "\n\n") + part);
		if (parts.length > 0 && maxBytes > 0 && Number.isFinite(maxBytes) && bytes + partBytes > maxBytes) break;
		parts.push(part);
		bytes += partBytes;
	}
	return parts.join("\n\n");
}
/**
* Register the rule contributor: an `agent/pre-step` listener that folds
* always-on rules at the first request and path-scoped rules as they activate,
* plus a `tools/result` listener that activates a path-scoped rule when a
* matching file is read.
*
* @param ctx - plugin context.
* @param config - home, root markers, file selection, and byte budgets.
* @param isEnabled - thunk returning whether Claude rule injection is on.
*/
function claudeRulesListener(ctx, config = {}, isEnabled = () => true) {
	const states = /* @__PURE__ */ new WeakMap();
	ctx.on("agent/pre-step", async ({ agent, signal }, next) => {
		const decision = await next();
		if (!isEnabled()) return decision;
		if (decision.kind === "reject") return decision;
		const session = agent.session;
		if (session === void 0) return decision;
		const state = ensureState(session, states);
		if (state.loaded === void 0) {
			const cwd = session.header?.cwd;
			if (cwd === void 0) return decision;
			state.loaded = await loadClaudeRules(cwd, ctx, config);
			seedNeverReinject(session, state);
		}
		signal.throwIfAborted();
		const toInject = selectRulesToInject(session, state, decision.messages.length);
		if (toInject.length === 0) return decision;
		const text = renderRules(toInject, config.maxRuleRenderBytes ?? DEFAULT_RULE_RENDER_BYTES);
		if (text.length === 0) return decision;
		for (const rule of toInject) state.injected.add(rule.absolutePath);
		return injectRulesIntoRequest(decision, text);
	});
	ctx.on("tools/result", (exec, result) => {
		if (isEnabled() && !result.isError && exec.name === READ_TOOL_NAME && exec.agent !== void 0) {
			const session = exec.agent.session;
			if (session !== void 0) {
				const state = ensureState(session, states);
				if (state.loaded !== void 0) {
					const filePath = readFilePath(exec);
					const cwd = exec.agent.session.header.cwd;
					if (filePath !== void 0 && cwd !== void 0) activateMatchingRules(state, filePath, cwd);
				}
			}
		}
	});
}
function ensureState(session, states) {
	let state = states.get(session);
	if (state === void 0) {
		state = {
			loaded: void 0,
			injected: /* @__PURE__ */ new Set(),
			activated: /* @__PURE__ */ new Set()
		};
		states.set(session, state);
	}
	return state;
}
/**
* Mark always-on rules as already injected when a `claude-rule` message already
* sits on the surfaced log (a resumed or prior-turn session), so they are not
* re-added while path-scoped rules may still activate in this session.
*/
function seedNeverReinject(session, state) {
	if (!hasClaudeRuleOnSurface(session)) return;
	for (const rule of state.loaded?.rules ?? []) if (rule.paths === void 0) state.injected.add(rule.absolutePath);
}
function hasClaudeRuleOnSurface(session) {
	return session.snapshotEvents().some((event) => event.type === "user/message" && event.data.source.kind === "claude-rule");
}
function selectRulesToInject(session, state, enteringMessageCount) {
	const alreadyFolded = hasClaudeRuleOnSurface(session);
	const selected = [];
	for (const rule of state.loaded?.rules ?? []) {
		if (state.injected.has(rule.absolutePath)) continue;
		if (rule.paths === void 0) {
			if (alreadyFolded || enteringMessageCount === 0) continue;
			selected.push(rule);
		} else if (state.activated.has(rule.absolutePath)) selected.push(rule);
	}
	return selected;
}
function activateMatchingRules(state, filePath, cwd) {
	const projectRoot = state.loaded?.projectRoot;
	if (projectRoot === void 0) return;
	const absolute = isAbsolute(filePath) ? resolve(filePath) : resolve(cwd, filePath);
	const projectRelative = pathToPosix(relative(projectRoot, absolute));
	if (projectRelative.length === 0 || projectRelative === ".." || projectRelative.startsWith("../") || isAbsolute(projectRelative)) return;
	for (const rule of state.loaded?.rules ?? []) {
		if (rule.paths === void 0 || state.injected.has(rule.absolutePath) || state.activated.has(rule.absolutePath)) continue;
		for (const glob of rule.paths) if (picomatch(pathToPosix(glob), { dot: true })(projectRelative)) {
			state.activated.add(rule.absolutePath);
			break;
		}
	}
}
function readFilePath(exec) {
	if (typeof exec.arguments !== "object" || exec.arguments === null) return void 0;
	if (!("file_path" in exec.arguments) || typeof exec.arguments.file_path !== "string") return void 0;
	const path = exec.arguments.file_path.trim();
	return path.length > 0 ? path : void 0;
}
async function readRuleFile(path, displayPath, maxSourceBytes, ctx) {
	const raw = await readRuleText(path, ctx);
	if (raw === void 0) return void 0;
	if (byteLength(raw) > maxSourceBytes) return void 0;
	const parsed = parseYamlFrontmatter(raw);
	return {
		absolutePath: path,
		displayPath,
		content: parsed === void 0 ? raw : parsed.body.trim(),
		paths: parsed === void 0 ? void 0 : parsePaths(parsed.data.paths)
	};
}
/**
* Parse the `paths` frontmatter value into a non-empty glob list, or `undefined`.
* @param value - the raw frontmatter `paths` value.
* @returns the non-empty glob list, or `undefined` when the value is empty or invalid.
*/
function parsePaths(value) {
	if (typeof value === "string") return value.length > 0 ? [value] : void 0;
	if (Array.isArray(value)) {
		const globs = value.filter((entry) => typeof entry === "string" && entry.length > 0);
		return globs.length > 0 ? globs : void 0;
	}
}
async function readRuleText(path, ctx) {
	const fs = ctx.get("fs");
	if (fs !== void 0) return await readRuleTextFromFs(path, fs);
	try {
		return await readFile(path, { encoding: "utf8" });
	} catch {
		return;
	}
}
async function readRuleTextFromFs(path, fs) {
	try {
		const target = await fs.resolve(path);
		const info = await fs.stat(target);
		if (info === void 0 || info.type !== "file") return void 0;
		return await fs.readText(target);
	} catch {
		return;
	}
}
async function walkRuleTree(root, ctx) {
	const fs = ctx.get("fs");
	if (fs !== void 0) return await walkRuleTreeFromFs(root, fs);
	return await walkRuleTreeFromNode(root);
}
async function walkRuleTreeFromFs(root, fs) {
	const found = [];
	await walkDirFromFs(root, fs, found);
	return found;
}
async function walkDirFromFs(dir, fs, found) {
	let entries;
	try {
		const target = await fs.resolve(dir);
		entries = await fs.listDir(target);
	} catch {
		return;
	}
	for (const entry of entries) {
		const childPath = entry.target.displayPath;
		if (entry.type === "directory") await walkDirFromFs(childPath, fs, found);
		else if (entry.type === "file" && entry.name.endsWith(".md")) found.push(childPath);
	}
}
async function walkRuleTreeFromNode(root) {
	const found = [];
	await walkDirFromNode(root, found);
	return found;
}
async function walkDirFromNode(dir, found) {
	let entries;
	try {
		entries = await readdir(dir, {
			withFileTypes: true,
			encoding: "utf8"
		});
	} catch {
		return;
	}
	for (const entry of entries) {
		const childPath = join(dir, entry.name);
		if (entry.isDirectory()) await walkDirFromNode(childPath, found);
		else if (entry.isFile() && entry.name.endsWith(".md")) found.push(childPath);
	}
}
/** Walk upward to the first directory containing a configured root marker. */
async function findProjectRoot(cwd, markers, ctx) {
	const fs = ctx.get("fs");
	let current = resolve(cwd);
	for (;;) {
		for (const marker of markers) if (await pathExists(join(current, marker), fs)) return current;
		const parent = dirname(current);
		if (parent === current) return resolve(cwd);
		current = parent;
	}
}
async function pathExists(path, fs) {
	if (fs !== void 0) try {
		const target = await fs.resolve(path);
		return await fs.stat(target) !== void 0;
	} catch {
		return false;
	}
	try {
		await readFile(path, { encoding: "utf8" });
		return true;
	} catch {
		return false;
	}
}
function pathToPosix(path) {
	return path.split("\\").join("/");
}
function byteLength(text) {
	return Buffer.byteLength(text, "utf8");
}
//#endregion
//#region src/context-injection.ts
/** Settings namespace shared by the Claude and Codex loaders. */
const CONTEXT_INJECTION_NAMESPACE = "context-injection";
/** Schema served to settings clients for the injection preference. */
const CONTEXT_INJECTION_SCHEMA = z.object({
	claude: z.boolean().default(true),
	codex: z.boolean().default(true),
	systemPrompt: z.string().default(""),
	mcpDescriptions: z.dict(String).default({})
});
/**
* Register the `context-injection` namespace and return a live reader.
*
* When the settings service is mounted, the namespace is registered and the
* reader follows committed changes. Without a settings service the reader stays
* pinned to the composition `base`. A namespace already owned by another plugin
* keeps that owner's reader — we never throw.
*
* @param ctx - plugin context (uses `ctx.get('settings')` when present).
* @param config - composition defaults for the two toggles.
* @returns a thunk returning the current flags.
*/
function registerContextInjection(ctx, config = {}) {
	const base = {
		claude: config.claude ?? true,
		codex: config.codex ?? true,
		systemPrompt: "",
		mcpDescriptions: {}
	};
	let source = () => ({ ...base });
	ctx.inject(["settings"], (settingsCtx) => {
		const provider = settingsCtx.settings;
		try {
			const scope = provider.register(CONTEXT_INJECTION_NAMESPACE, CONTEXT_INJECTION_SCHEMA, {
				base,
				applies: "live"
			});
			source = () => ({ ...scope.get() });
			scope.watch((next) => {
				source = () => ({ ...next });
			});
		} catch {}
	});
	return () => ({ ...source() });
}
//#endregion
//#region src/command-btw.ts
const USAGE = "Usage: /btw <question>";
/** Library default for the optional question byte cap. */
const DEFAULT_MAX_QUESTION_BYTES = 4096;
/** Library default for the `ctx.subagents` fork provider name. */
const DEFAULT_PROVIDER = "fork";
/** Loader field schemas with library defaults. */
const ConfigFields = {
	maxQuestionBytes: z.number().step(1).min(1).default(DEFAULT_MAX_QUESTION_BYTES),
	provider: z.string().min(1).default(DEFAULT_PROVIDER)
};
z.object(ConfigFields);
const CONFIG_KEYS = /* @__PURE__ */ new Set(["maxQuestionBytes", "provider"]);
/**
* Validate and detach required `/btw` configuration.
* @param config - untrusted plugin configuration.
* @returns immutable policy with library defaults applied.
*/
function resolveConfig(config) {
	const candidate = config;
	if (candidate === null || typeof candidate !== "object") throw new Error("command-btw: configuration is required");
	const value = candidate;
	for (const key of Object.keys(value)) if (!CONFIG_KEYS.has(key)) throw new Error(`command-btw: unknown config key "${key}"`);
	const maxQuestionBytes = value.maxQuestionBytes ?? DEFAULT_MAX_QUESTION_BYTES;
	if (!Number.isSafeInteger(maxQuestionBytes) || maxQuestionBytes <= 0) throw new Error("command-btw: maxQuestionBytes must be a positive integer");
	const provider = value.provider ?? DEFAULT_PROVIDER;
	if (typeof provider !== "string" || provider.length === 0) throw new Error("command-btw: provider must be a non-empty string");
	return Object.freeze({
		maxQuestionBytes,
		provider
	});
}
/**
* Whether the session is unsuitable to fork from: either a turn is still open
* (`turn/start` without a matching `turn/end`) or no turn has ever completed
* (`lastTurn` is 0). Under the strict balanced-history requirement a fork is
* refused in both cases, so the child always inherits a complete, closed
* prefix.
* @param session - the session to inspect.
* @param ctx - context exposing the `turnBoundary` projection.
* @returns a human-readable reason, or undefined when the history is balanced.
*/
function unbalancedForkReason(ctx, session) {
	const state = ctx.sessionProjections.stateOf(session, "turnBoundary");
	if (state === void 0) return void 0;
	if (state.openTurnStartSeq !== null) return "/btw requires a balanced history; wait for the current turn to finish before forking a side question.";
	if (state.lastTurn === 0) return "/btw requires at least one completed turn to fork from; finish a turn first.";
}
/**
* Fork one `/btw` question as a continuable child subagent.
*
* The handler refuses empty or oversized questions, an in-progress parent
* turn, and a session with no completed turn, so the child always inherits a
* fully balanced prefix. It then calls `ctx.subagents.startContinuable` on the
* configured fork provider, records a log-only `btw/spawn` event with the
* child id, and returns a short acknowledgement. The answer and any follow-up
* conversation live in the child session.
* @param ctx - context exposing the commands, subagents, and projection services.
* @param config - validated deployment policy.
* @param invocation - receiving agent, raw command input, and UI cancellation.
* @returns the settled command result.
*/
async function forkBtw(ctx, config, invocation) {
	const question = invocation.rawInput.trim();
	if (question.length === 0) return {
		kind: "error",
		text: `A question is required. ${USAGE}`
	};
	if (Buffer.byteLength(question, "utf8") > config.maxQuestionBytes) return {
		kind: "error",
		text: `The question exceeds the ${config.maxQuestionBytes}-byte limit.`
	};
	const session = invocation.agent.session;
	const unbalanced = unbalancedForkReason(ctx, session);
	if (unbalanced !== void 0) return {
		kind: "error",
		text: unbalanced
	};
	const provider = ctx.subagents.getProvider(config.provider);
	if (provider === void 0) return {
		kind: "error",
		text: `/btw is unavailable: no "${config.provider}" subagent provider is registered.`
	};
	if (provider.prepareContinuable === void 0) return {
		kind: "error",
		text: `/btw is unavailable: the "${config.provider}" provider cannot create continuable children.`
	};
	const label = `btw: ${question.slice(0, 80)}`;
	const started = await ctx.subagents.startContinuable({
		provider: config.provider,
		label,
		request: {
			prompt: [{
				type: "text",
				text: `Answer this side question from the parent context: ${question}`
			}],
			parent: invocation.agent
		},
		signal: invocation.signal
	});
	invocation.agent.session.append("btw/spawn", {
		question,
		childId: started.childId
	});
	return {
		kind: "success",
		text: `Started /btw as child session ${started.childId}. The answer and any follow-up live there.`
	};
}
/** Register the global `/btw` command for every composed command adapter. */
function apply$1(ctx, config = {}) {
	const resolved = resolveConfig(config);
	ctx.commands.register({
		name: "btw",
		description: "by the way: fork a child subagent to answer a side question",
		input: { hint: "<question>" },
		recordInput: false,
		handler: (invocation) => forkBtw(ctx, resolved, invocation)
	});
}
//#endregion
//#region src/mcp-authoring.ts
/** File-backed MCP row mutations for Claude-compatible preset compositions. */
/** Module specifier of the MCP client bridge these helpers author. */
const MCP_CLIENT_MODULE = "@deepseek-ai/dsh-mcp-client";
/**
* Validate one parsed Loader entry list before applying a mutation.
* @param value - parsed YAML or JSON content.
* @returns the first validation problem, or undefined for a valid entry list.
*/
function entryListProblem(value) {
	if (!Array.isArray(value)) return "composition must be a top-level entry list";
	return entryListRowsProblem(value, "composition");
}
function entryListRowsProblem(rows, path) {
	for (const [index, value] of rows.entries()) {
		if (typeof value !== "object" || value === null || Array.isArray(value)) return `${path}[${index}] must be an entry object`;
		const row = value;
		if (typeof row.id !== "string" || row.id.length === 0) return `${path}[${index}].id must be a non-empty string`;
		if (typeof row.name !== "string" || row.name.length === 0) return `${path}[${index}].name must be a non-empty string`;
		if (row.group === true) {
			if (!Array.isArray(row.config)) return `${path}[${index}].config must be an entry list for a group`;
			const problem = entryListRowsProblem(row.config, `${path}[${index}].config`);
			if (problem !== void 0) return problem;
		}
	}
}
/**
* Find rows recursively, preserving the local Loader ids used by patches.
* @param rows - entry rows at the current composition level.
* @param id - row id to locate.
* @returns every matching row, including nested group children.
*/
function findEntryRows(rows, id) {
	const found = [];
	for (const row of rows) {
		if (row.id === id) found.push(row);
		if (row.group === true && Array.isArray(row.config)) found.push(...findEntryRows(row.config, id));
	}
	return found;
}
/**
* Collect every row id in a composition, including nested group children.
* @param rows - entry rows at the current composition level.
* @returns all row ids in the composition.
*/
function entryIds(rows) {
	const ids = /* @__PURE__ */ new Set();
	for (const row of rows) {
		ids.add(row.id);
		if (row.group === true && Array.isArray(row.config)) for (const id of entryIds(row.config)) ids.add(id);
	}
	return ids;
}
/** Reject a preset path that traverses a symbolic link. */
async function assertNoSymlink(path) {
	let current = resolve(path);
	for (;;) {
		try {
			if ((await lstat(current)).isSymbolicLink()) throw new Error(`preset composition path contains a symbolic link: ${current}`);
		} catch (error) {
			if (error.code !== "ENOENT") throw error;
		}
		const parent = dirname(current);
		if (parent === current) return;
		current = parent;
	}
}
/**
* Apply one Loader patch to an entry-list file and replace it atomically.
* @param filename - YAML or JSON entry-list path.
* @param target - the Remote target used in actionable failure details.
* @param patch - one Loader patch to apply.
* @param validate - target and duplicate checks run against locked disk state.
* @param warn - sink for skipped-patch diagnostics.
* @returns a promise resolving after the atomic replacement is committed.
* @throws an MCP Remote error when the file cannot be read or parsed.
*/
async function writeEntryListFile(filename, target, patch, validate, warn) {
	await assertNoSymlink(filename);
	await withFileLock(filename, async () => {
		await assertNoSymlink(filename);
		let parsed;
		try {
			parsed = load(await readFile(filename, "utf8"), { schema: entryListSchema });
		} catch (cause) {
			throw new RemoteError("mcp/invalid", "MCP entry-list file could not be read", {
				target,
				reason: String(cause)
			}, { cause });
		}
		const problem = entryListProblem(parsed);
		if (problem !== void 0) throw new RemoteError("mcp/invalid", "MCP entry-list file is not valid", {
			target,
			reason: problem
		});
		const rows = parsed;
		validate(rows);
		const next = applyEntryPatches(rows, [patch], warn);
		const content = extname(filename).toLowerCase() === ".json" ? JSON.stringify(next, null, 2) + "\n" : dump(next, { schema: entryListSchema });
		await writeFileAtomic(filename, content, {
			mode: 384,
			dirMode: 448
		});
	});
}
/**
* Apply one Loader patch to a user preset and replace the YAML file atomically.
* `entryListSchema` preserves `!!js` disabled expressions, while the lock
* serializes the complete read-validate-patch-write cycle across processes.
* @param preset - the roster record resolved for the requested preset.
* @param target - the Remote target used in actionable failure details.
* @param patch - one Loader patch to apply.
* @param validate - target and duplicate checks run against locked disk state.
* @param warn - sink for skipped-patch diagnostics.
* @returns a promise resolving after the atomic replacement is committed.
* @throws an MCP Remote error when the preset cannot be authored or parsed.
*/
async function writePresetComposition(preset, target, patch, validate, warn) {
	if (preset.trust !== "user") throw new RemoteError("mcp/read-only", `MCP preset "${preset.id}" is not user-writable`, {
		target,
		reason: "the preset ships with the deployment"
	});
	if (!isAbsolute(preset.path)) throw new RemoteError("mcp/invalid", `MCP preset "${preset.id}" has a non-absolute composition path`, {
		target,
		reason: "the resolved composition path is not absolute"
	});
	if (preset.broken !== void 0) throw new RemoteError("mcp/invalid", `MCP preset "${preset.id}" is broken: ${preset.broken}`, {
		target,
		reason: preset.broken
	});
	await writeEntryListFile(preset.path, target, patch, validate, warn);
}
/**
* Read and validate one entry-list composition file, returning its rows.
* Used by the read-only describe path; the write helpers (entry-list and preset
* composition) keep their own locked/full validation.
* @param filename - YAML or JSON entry-list path.
* @returns the parsed entry rows.
* @throws when the file cannot be read or is not a valid entry list.
*/
async function readEntryRows(filename) {
	let parsed;
	try {
		parsed = load(await readFile(filename, "utf8"), { schema: entryListSchema });
	} catch (cause) {
		throw new RemoteError("mcp/invalid", "MCP entry-list file could not be read", { reason: String(cause) }, { cause });
	}
	const problem = entryListProblem(parsed);
	if (problem !== void 0) throw new RemoteError("mcp/invalid", "MCP entry-list file is not valid", { reason: problem });
	return parsed;
}
/**
* Return a stable leaf id for a mounted preset row address.
* @param entryId - local or loader-qualified row id.
* @returns the row id used in the preset composition file.
*/
function presetLeafId(entryId) {
	const separator = entryId.lastIndexOf(":");
	return separator < 0 ? entryId : entryId.slice(separator + 1);
}
//#endregion
//#region src/mcp-config.ts
/**
* MCP config authoring helpers: convert the settings form's JSON spec
* (Claude Code-style `type`/`command`/`args`) into the `mcp-client` Config
* shape, and back, so the roster and the edit form share one form. The spec is
* validated strictly — a malformed or unknown-transport spec is refused before
* it reaches a composition file.
* @module @deepseek-ai/dsh-claude-compat/mcp-config
*/
/** mcp-client `serverName` namespace pattern (`mcp__<serverName>__<rawName>`). */
const MCP_SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
/**
* Validate a server-name string.
* @param serverName - candidate server namespace.
* @returns the value when valid.
* @throws when it does not match the mcp-client namespace pattern.
*/
function assertServerName(serverName) {
	if (!MCP_SERVER_NAME_PATTERN.test(serverName)) throw new Error(`MCP serverName must match ${String(MCP_SERVER_NAME_PATTERN)}`);
	return serverName;
}
/**
* Convert a form spec + identity into the mcp-client entry config.
* @param spec - the user-supplied JSON spec.
* @param serverName - the server namespace (unique per entry).
* @returns the mcp-client connection config shape. Display descriptions stay in
* the `context-injection` settings namespace and are not written to MCP rows.
* @throws when the spec is malformed or the transport fragment is incomplete.
*/
function mcpEntryConfig(spec, serverName) {
	assertServerName(serverName);
	switch (spec.type) {
		case "stdio": {
			const command = spec.command;
			if (typeof command !== "string" || command.length === 0) throw new Error("MCP stdio spec requires a command string");
			return {
				transport: "stdio",
				serverName,
				command,
				args: [...spec.args ?? []],
				env: { ...spec.env },
				cwd: spec.cwd ?? ""
			};
		}
		case "http":
		case "sse":
		case "streamable-http": {
			const url = spec.url;
			if (typeof url !== "string" || url.length === 0) throw new Error("MCP http spec requires a url");
			return {
				transport: "streamable-http",
				serverName,
				url,
				headers: { ...spec.headers }
			};
		}
		default: throw new Error(`Unknown MCP transport type: ${String(spec.type)}`);
	}
}
/**
* Reverse a stored entry config into the form spec (for editing).
* @param config - the mcp-client connection config read from an entry.
* @returns the Claude Code-style spec the edit form edits.
*/
function specFromEntryConfig(config) {
	if (config.transport === "stdio") return {
		type: "stdio",
		command: config.command,
		args: config.args,
		env: config.env,
		cwd: config.cwd
	};
	return {
		type: "streamable-http",
		url: config.url,
		headers: config.headers
	};
}
//#endregion
//#region src/mcp-remote.ts
/** Typert Remote owner for global and agent-preset MCP row authoring. */
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) {
			if (kind === "field") initializers.unshift(_);
			else descriptor[key] = _;
		}
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/**
* Host service behind the `claudeCompatMcp` Remote namespace. Preset mutations
* update the resolved user's composition file; global mutations use the one
* unpatched root Include so Loader lifecycle and file state remain aligned.
*/
let ClaudeCompatMcp = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _addMcp_decorators;
	let _editMcp_decorators;
	let _disableMcp_decorators;
	let _describeMcp_decorators;
	return class ClaudeCompatMcp extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_addMcp_decorators = [Remote("addMcp")];
			_editMcp_decorators = [Remote("editMcp")];
			_disableMcp_decorators = [Remote("disableMcp")];
			_describeMcp_decorators = [Remote("describeMcp")];
			__esDecorate(this, null, _addMcp_decorators, {
				kind: "method",
				name: "addMcp",
				static: false,
				private: false,
				access: {
					has: (obj) => "addMcp" in obj,
					get: (obj) => obj.addMcp
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _editMcp_decorators, {
				kind: "method",
				name: "editMcp",
				static: false,
				private: false,
				access: {
					has: (obj) => "editMcp" in obj,
					get: (obj) => obj.editMcp
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _disableMcp_decorators, {
				kind: "method",
				name: "disableMcp",
				static: false,
				private: false,
				access: {
					has: (obj) => "disableMcp" in obj,
					get: (obj) => obj.disableMcp
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _describeMcp_decorators, {
				kind: "method",
				name: "describeMcp",
				static: false,
				private: false,
				access: {
					has: (obj) => "describeMcp" in obj,
					get: (obj) => obj.describeMcp
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["loader"];
		mutationQueue = (__runInitializers(this, _instanceExtraInitializers), Promise.resolve());
		constructor(ctx) {
			super(ctx, "claudeCompatMcp");
		}
		/**
		* Add one MCP client row to a global or user preset composition.
		* @param request - target, row identity, server namespace, and transport spec.
		* @returns the redacted row identity after the file-backed mutation commits.
		* @throws a typed MCP error when the target is unavailable, read-only,
		* malformed, duplicated, or not an MCP composition row.
		*/
		async addMcp(request) {
			return this.enqueue(() => this.add(request));
		}
		/**
		* Replace one MCP client row's connection configuration.
		* @param request - target row, new server namespace, and transport spec.
		* @returns the redacted row identity after the mutation commits.
		* @throws a typed MCP error when the target is unavailable, read-only,
		* malformed, duplicated, or not an MCP composition row.
		*/
		async editMcp(request) {
			return this.enqueue(() => this.edit(request));
		}
		/**
		* Enable or disable one MCP client row.
		* @param request - target row and the requested disabled state.
		* @returns the redacted row identity after the mutation commits.
		* @throws a typed MCP error when the target is unavailable, read-only,
		* malformed, or not an MCP composition row.
		*/
		async disableMcp(request) {
			return this.enqueue(() => this.disable(request));
		}
		/**
		* Read one MCP client row's current connection spec.
		* @param request - target row identity.
		* @returns the row's identity and connection spec for the editor to prefill.
		* @throws a typed MCP error when the target is unavailable, read-only,
		* malformed, or not an MCP composition row.
		*/
		async describeMcp(request) {
			const target = validateTarget(request.target);
			validateEntryId(request.entryId, target, false);
			if (target.scope === "global") {
				const include = await this.globalInclude(target);
				const entry = this.globalMcpEntry(request.entryId, target, include.tree);
				const serverName = serverNameOf(entry.options);
				if (serverName === void 0) throw invalid(target, "the MCP row has no valid serverName");
				return {
					target,
					entryId: entry.id,
					serverName,
					spec: specFromEntryConfig(entry.options.config),
					disabled: entry.disabled ?? false
				};
			}
			const preset = await this.resolvePreset(target);
			const entryId = presetLeafId(request.entryId);
			const rows = await readEntryRows(preset.path);
			const row = this.presetMcpRow(rows, entryId, target);
			const serverName = serverNameOf(row) ?? entryId;
			if (row.config === void 0 || typeof row.config !== "object" || row.config === null) throw invalid(target, `preset row "${entryId}" has no connection config`);
			return {
				target,
				entryId,
				serverName,
				spec: specFromEntryConfig(row.config),
				disabled: row.disabled === true
			};
		}
		enqueue(operation) {
			const run = this.mutationQueue.then(operation, operation);
			this.mutationQueue = run.then(() => void 0, () => void 0);
			return run;
		}
		async add(request) {
			const target = validateTarget(request.target);
			const config = configFromSpec(request.spec, request.serverName, target);
			const entryId = request.entryId ?? request.serverName;
			validateEntryId(entryId, target, true);
			if (target.scope === "global") {
				const include = await this.globalInclude(target);
				const rows = [...include.tree.entries()];
				if (rows.some((entry) => entry.options.id === entryId)) throw conflict(target, entryId, void 0, "the row id is already in use");
				if (rows.some((entry) => entry.options.name === "@deepseek-ai/dsh-mcp-client" && serverNameOf(entry.options) === request.serverName)) throw conflict(target, entryId, request.serverName, "the serverName is already in use");
				await writeEntryListFile(include.tree.filename, target, { insert: [{
					id: entryId,
					name: MCP_CLIENT_MODULE,
					config
				}] }, (rows) => {
					if (entryIds(rows).has(entryId)) throw conflict(target, entryId, void 0, "the row id is already in use");
					if (rows.some((row) => row.name === "@deepseek-ai/dsh-mcp-client" && serverNameOf(row) === request.serverName)) throw conflict(target, entryId, request.serverName, "the serverName is already in use");
				}, this.warnPatch);
				return {
					target,
					entryId: await this.loader().create({
						id: entryId,
						name: MCP_CLIENT_MODULE,
						config
					}, include.entry.id),
					serverName: request.serverName,
					disabled: false
				};
			}
			const preset = await this.resolvePreset(target);
			await writePresetComposition(preset, target, { insert: [{
				id: entryId,
				name: MCP_CLIENT_MODULE,
				config
			}] }, (rows) => {
				if (entryIds(rows).has(entryId)) throw conflict(target, entryId, void 0, "the row id is already in use");
				if (rows.some((row) => row.name === "@deepseek-ai/dsh-mcp-client" && serverNameOf(row) === request.serverName)) throw conflict(target, entryId, request.serverName, "the serverName is already in use");
			}, this.warnPatch);
			await this.refreshPreset(preset.id);
			return {
				target,
				entryId,
				serverName: request.serverName,
				disabled: false
			};
		}
		async edit(request) {
			const target = validateTarget(request.target);
			const config = configFromSpec(request.spec, request.serverName, target);
			validateEntryId(request.entryId, target, false);
			if (target.scope === "global") {
				const include = await this.globalInclude(target);
				const entry = this.globalMcpEntry(request.entryId, target, include.tree);
				const disabled = entry.disabled;
				this.assertServerNameAvailable([...include.tree.entries()], request.entryId, request.serverName, target);
				await this.loader().update(request.entryId, { config });
				const rowId = entry.options.id;
				await writeEntryListFile(include.tree.filename, target, {
					id: rowId,
					name: MCP_CLIENT_MODULE,
					config
				}, (rows) => {
					this.presetMcpRow(rows, rowId, target);
					this.assertServerNameAvailable(rows, rowId, request.serverName, target);
				}, this.warnPatch);
				return {
					target,
					entryId: entry.id,
					serverName: request.serverName,
					disabled
				};
			}
			const preset = await this.resolvePreset(target);
			const entryId = presetLeafId(request.entryId);
			let disabled = false;
			await writePresetComposition(preset, target, {
				id: entryId,
				name: MCP_CLIENT_MODULE,
				config
			}, (rows) => {
				disabled = this.presetMcpRow(rows, entryId, target).disabled === true;
				this.assertServerNameAvailable(rows, entryId, request.serverName, target);
			}, this.warnPatch);
			await this.refreshPreset(preset.id);
			return {
				target,
				entryId,
				serverName: request.serverName,
				disabled
			};
		}
		async disable(request) {
			const target = validateTarget(request.target);
			validateEntryId(request.entryId, target, false);
			if (target.scope === "global") {
				const include = await this.globalInclude(target);
				const entry = this.globalMcpEntry(request.entryId, target, include.tree);
				const serverName = serverNameOf(entry.options);
				if (serverName === void 0) throw invalid(target, "the MCP row has no valid serverName");
				await this.loader().update(request.entryId, { disabled: request.disabled });
				const rowId = entry.options.id;
				await writeEntryListFile(include.tree.filename, target, {
					id: rowId,
					name: MCP_CLIENT_MODULE,
					disabled: request.disabled
				}, (rows) => {
					this.presetMcpRow(rows, rowId, target);
				}, this.warnPatch);
				return {
					target,
					entryId: entry.id,
					serverName,
					disabled: request.disabled
				};
			}
			const preset = await this.resolvePreset(target);
			const entryId = presetLeafId(request.entryId);
			let serverName = entryId;
			await writePresetComposition(preset, target, {
				id: entryId,
				name: MCP_CLIENT_MODULE,
				disabled: request.disabled
			}, (rows) => {
				serverName = serverNameOf(this.presetMcpRow(rows, entryId, target)) ?? entryId;
			}, this.warnPatch);
			await this.refreshPreset(preset.id);
			return {
				target,
				entryId,
				serverName,
				disabled: request.disabled
			};
		}
		async resolvePreset(target) {
			const presets = this.ctx.get("agentPresets");
			if (presets === void 0) throw new RemoteError("mcp/unavailable", "agent preset MCP authoring is unavailable", { reason: "agentPresets is not mounted in this composition" });
			try {
				return await presets.resolve(target.agentPreset);
			} catch (cause) {
				if (cause instanceof RemoteError) throw cause;
				throw new RemoteError("mcp/not-found", `MCP preset "${target.agentPreset}" was not found`, { target }, { cause });
			}
		}
		/**
		* Apply a just-written preset composition to its live standing mount.
		*
		* Re-reads the file through the mount's own `Include` tree (`refresh()`),
		* which diffs child entries and mounts/unmounts only what changed. A full
		* `standingKeyFor` recompose would start a new generation and remount every
		* row — restarting every MCP child process in the preset — so the targeted
		* refresh is the difference between a sub-second toggle and several seconds.
		* A preset that is not mounted has nothing live to update; a failure is
		* logged rather than thrown so a committed file write still reports success.
		* @param agentPreset - preset id whose composition was just written.
		*/
		async refreshPreset(agentPreset) {
			try {
				const mountsFor = await this.mountRegistry();
				if (mountsFor !== void 0) {
					const mount = mountsFor().filter((candidate) => candidate.presetId === agentPreset).at(-1);
					const refresh = mount?.tree?.refresh;
					if (refresh !== void 0 && mount !== void 0) {
						await refresh.call(mount.tree);
						return;
					}
				}
				const presets = this.ctx.get("agentPresets");
				if (presets?.standingKeyFor !== void 0) await presets.standingKeyFor(agentPreset);
			} catch (error) {
				this.warnPatch(`claude-compat: preset "${agentPreset}" refresh failed after edit: ${String(error)}`);
			}
		}
		/**
		* Resolve the `livePresetMounts` reader from the agent-presets instance the
		* Loader actually uses. A plain import can land on a second copy of the
		* package (the harness resolves the roster from its own graph), so this goes
		* through the Loader's internal resolver with the harness base first, then
		* falls back to the statically imported reader.
		* @returns the mount reader, or undefined when neither path is available.
		*/
		async mountRegistry() {
			const loader = this.ctx.get("loader");
			const base = this.ctx.baseUrl;
			if (loader?.internal !== void 0 && base !== void 0) try {
				const mod = await loader.internal.import("@deepseek-ai/dsh-agent-presets", base, {});
				if (mod.livePresetMounts !== void 0) return mod.livePresetMounts;
			} catch {}
			return () => livePresetMounts();
		}
		async globalInclude(target) {
			const includes = [...this.loader().entries()].filter((entry) => entry.options.name === "cordis:include" && entry.subtree);
			if (includes.length !== 1) throw new RemoteError("mcp/unavailable", "global MCP authoring requires exactly one file-backed Include", { reason: includes.length === 0 ? "no root Include is mounted" : `${includes.length} Includes are mounted` });
			const entry = includes[0];
			const tree = entry.subtree;
			const filename = tree.filename;
			if (filename === void 0) throw new RemoteError("mcp/unavailable", "global MCP authoring has no persistent Include file", { reason: "the mounted global tree does not expose a writable filename" });
			if ((tree.config?.patches?.length ?? 0) > 0) throw new RemoteError("mcp/read-only", "global MCP authoring cannot persist a patched Include", {
				target,
				reason: "Loader write-back would flatten bundle and user patch layers"
			});
			try {
				await access(filename, constants.W_OK);
			} catch (cause) {
				const reason = String(cause);
				throw new RemoteError("mcp/read-only", `global MCP config is not writable: ${filename}`, {
					target,
					reason
				}, { cause });
			}
			return {
				entry,
				tree
			};
		}
		globalMcpEntry(entryId, target, tree) {
			let entry;
			try {
				entry = this.loader().resolve(entryId);
			} catch (cause) {
				throw new RemoteError("mcp/not-found", `MCP loader row "${entryId}" was not found`, {
					target,
					entryId
				}, { cause });
			}
			if (!Array.from(tree.entries()).includes(entry)) throw new RemoteError("mcp/not-found", `MCP loader row "${entryId}" is outside the global Include`, {
				target,
				entryId
			});
			if (entry.options.name !== "@deepseek-ai/dsh-mcp-client" || entry.options.group) throw invalid(target, `loader row "${entryId}" is not an MCP client row`);
			return entry;
		}
		presetMcpRow(rows, entryId, target) {
			const found = findEntryRows(rows, entryId);
			if (found.length === 0) throw new RemoteError("mcp/not-found", `MCP preset row "${entryId}" was not found`, {
				target,
				entryId
			});
			if (found.length > 1) throw conflict(target, entryId, void 0, "the row id occurs more than once");
			const row = found[0];
			if (row.name !== "@deepseek-ai/dsh-mcp-client" || row.group) throw invalid(target, `preset row "${entryId}" is not an MCP client row`);
			return row;
		}
		assertServerNameAvailable(entries, entryId, serverName, target) {
			for (const value of entries) {
				const options = "options" in value ? value.options : value;
				const fullId = "options" in value ? value.id : void 0;
				if (options.id === entryId || fullId === entryId || options.name !== "@deepseek-ai/dsh-mcp-client" || options.group) continue;
				if (serverNameOf(options) === serverName) throw conflict(target, entryId, serverName, "the serverName is already in use");
			}
		}
		/** Resolve the Loader through `ctx.get`, never property access: an un-injected
		* service property throws under Cordis's inject guard, and the authoring
		* operations need the Loader lazily (it may not be ready at construction). */
		loader() {
			return this.ctx.get("loader");
		}
		warnPatch = (message, ...args) => {
			this.ctx.get("logger")?.warn(message, ...args);
		};
	};
})();
function validateTarget(value) {
	if (value.scope === "global") return { scope: "global" };
	if (value.agentPreset.length > 0) return {
		scope: "preset",
		agentPreset: value.agentPreset
	};
	throw badRequest("target must select global or a non-empty preset id");
}
function validateEntryId(entryId, target, adding) {
	if (entryId.length === 0) throw badRequest("entryId must be a non-empty string");
	if (adding && target.scope === "global" && entryId.includes(":")) throw badRequest("a new global entryId must be local to the Include root");
}
function configFromSpec(spec, serverName, target) {
	try {
		return mcpEntryConfig(spec, assertServerName(serverName));
	} catch (cause) {
		throw invalid(target, String(cause));
	}
}
function serverNameOf(options) {
	const config = options.config;
	if (config === null || typeof config !== "object" || Array.isArray(config)) return void 0;
	const record = config;
	return typeof record.serverName === "string" ? record.serverName : void 0;
}
function badRequest(message) {
	return new RemoteError("gateway/bad-request", message, {});
}
function invalid(target, reason) {
	return new RemoteError("mcp/invalid", reason, {
		target,
		reason
	});
}
function conflict(target, entryId, serverName, reason) {
	return new RemoteError("mcp/conflict", reason, {
		target,
		entryId,
		...serverName === void 0 ? {} : { serverName },
		reason
	});
}
//#endregion
//#region src/index.ts
/** Cordis plugin name used by loader diagnostics. */
const name = "claude-compat";
/** Services required by this plugin. `systemPrompt` and `settings` are probed lazily. */
const inject = [
	"skills",
	"commands",
	"sessionProjections",
	"subagents"
];
const Config = z.object({
	providerName: z.string().min(1).default("claude-code"),
	claudeHome: z.string(),
	codexHome: z.string(),
	projectRootMarkers: z.array(z.string()).default([".git"]),
	includeProjectRoot: z.boolean().default(true),
	includeGlobalRoot: z.boolean().default(true),
	includeProjectRule: z.boolean().default(true),
	includeGlobalRule: z.boolean().default(true),
	includeProjectRules: z.boolean().default(true),
	includeGlobalRules: z.boolean().default(true),
	maxRuleSourceBytes: z.number().step(1).min(1).default(1048576),
	maxRuleRenderBytes: z.number().step(1).min(0).default(262144),
	claude: z.boolean().default(true),
	codex: z.boolean().default(true),
	maxQuestionBytes: z.number().step(1).min(1).default(4096),
	provider: z.string().min(1).default("fork")
});
/**
* Register the Claude Code skill provider and instruction/rule contributors,
* the `context-injection` namespace, and the `/btw` command.
*/
async function apply(ctx, config = {}) {
	const flags = registerContextInjection(ctx, config);
	ctx.skills.registerProvider((control) => new ClaudeCodeSkillProvider(ctx, control, {
		...config,
		enabled: () => flags().claude
	}));
	claudeInstructionListener(ctx, config, () => flags().claude);
	claudeRulesListener(ctx, {
		...config.claudeHome !== void 0 ? { claudeHome: config.claudeHome } : {},
		...config.projectRootMarkers !== void 0 ? { projectRootMarkers: config.projectRootMarkers } : {},
		...config.includeProjectRules !== void 0 ? { includeProjectRules: config.includeProjectRules } : {},
		...config.includeGlobalRules !== void 0 ? { includeGlobalRules: config.includeGlobalRules } : {},
		...config.maxRuleSourceBytes !== void 0 ? { maxRuleSourceBytes: config.maxRuleSourceBytes } : {},
		...config.maxRuleRenderBytes !== void 0 ? { maxRuleRenderBytes: config.maxRuleRenderBytes } : {}
	}, () => flags().claude);
	codexInstructionListener(ctx, {
		...config.codexHome !== void 0 ? { codexHome: config.codexHome } : {},
		...config.projectRootMarkers !== void 0 ? { projectRootMarkers: config.projectRootMarkers } : {}
	}, () => flags().codex);
	const systemPrompt = ctx.get("systemPrompt");
	if (systemPrompt !== void 0) systemPrompt.section({
		name: "context-injection:user-system-prompt",
		order: 100,
		text: () => flags().systemPrompt
	});
	apply$1(ctx, {
		maxQuestionBytes: config.maxQuestionBytes,
		provider: config.provider
	});
	new ClaudeCompatMcp(ctx);
}
//#endregion
export { ClaudeCompatMcp, Config, apply, assertServerName, inject, mcpEntryConfig, name, specFromEntryConfig };
