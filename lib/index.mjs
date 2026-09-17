import z from "@deepseek-ai/schemastery";
import { homedir } from "node:os";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { isSkillName } from "@deepseek-ai/dsh-skill";
import { parse } from "yaml";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import picomatch from "picomatch/posix.js";
import { randomUUID } from "node:crypto";
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
//#region src/sources.ts
/** Package identity recorded on every injected message this plugin produces. */
const PLUGIN_ID = "@zhang-guo-wen/dsh-claude-compat";
/**
* The source for one contributor's injected instructions. The loader name rides
* in `plugin` so a transcript row still names which loader supplied the text,
* while the durable kind stays inside the released set.
* @param loader - contributor that produced the content.
* @returns an instructions-form model source owned by this plugin.
*/
function instructionsSource(loader) {
	return {
		kind: "plugin",
		plugin: `${PLUGIN_ID}#${loader}`,
		form: "instructions"
	};
}
/**
* Whether one logged message source came from this plugin's `<loader>`
* contributor.
*
* The contributors ask this of a session log to avoid folding the same rules in
* twice. Both shapes answer yes: the current `plugin` source, and the two
* bespoke kinds this package wrote before it moved onto that source. Reading the
* legacy names back never writes them again — it only keeps a resumed Session
* that already carries the content from receiving it a second time.
* @param source - a logged message's `source` value, of unknown provenance.
* @param loader - contributor whose earlier injection is being looked for.
* @returns whether that contributor already supplied instructions here.
*/
function isInstructionsSource(source, loader) {
	if (typeof source !== "object" || source === null) return false;
	const kind = source.kind;
	if (kind === loader) return true;
	return kind === "plugin" && source.plugin === `@zhang-guo-wen/dsh-claude-compat#${loader}`;
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
* two Claude Code rule files as an additional instructions-form context under
* the generic `plugin` source — the `agent-instructions` inbox filters match
* only their own kind, so the two loaders never manage each other's messages.
* It folds the content into the first request the same way
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
	const content = [{
		type: "text",
		text
	}];
	const source = instructionsSource("claude-code");
	const message = createUserMessage({
		content,
		source
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
		if (session.snapshotEvents().some((event) => event.type === "user/message" && isInstructionsSource(event.data.source, "claude-code"))) return decision;
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
* the generic `plugin` source, so the `agent-instructions` inbox filters never
* manage these messages.
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
	const content = [{
		type: "text",
		text
	}];
	const source = instructionsSource("codex");
	const message = createUserMessage({
		content,
		source
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
		if (session.snapshotEvents().some((event) => event.type === "user/message" && isInstructionsSource(event.data.source, "codex"))) return decision;
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
* The folded content reaches the model as one `user` message under the generic
* `plugin` source, so the `agent-instructions` inbox filters (which match only
* `agent-instructions`) never manage these messages and the contributor never
* re-injects a rule already on the surfaced log.
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
	const content = [{
		type: "text",
		text
	}];
	const source = instructionsSource("claude-rule");
	const message = createUserMessage({
		content,
		source
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
	return session.snapshotEvents().some((event) => event.type === "user/message" && isInstructionsSource(event.data.source, "claude-rule"));
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
	systemPrompt: z.string().default("")
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
		systemPrompt: ""
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
//#region src/btw-receipt.ts
/** Prefix of the `/btw` acknowledgement; the forked Session id follows it. */
const STARTED_PREFIX = "Started /btw as child session ";
/**
* Render the `/btw` acknowledgement for one forked Session.
* @param childSessionId - the forked Session's durable id.
* @returns the command success text.
*/
function startedText(childSessionId) {
	return `${STARTED_PREFIX}${childSessionId}. The answer and any follow-up live there.`;
}
//#endregion
//#region src/command-btw.ts
/**
* Human-facing `/btw` ("by the way") command: forks the receiving session into
* a continuation Session that answers a side question.
*
* The handler does NOT answer the question in the receiving session. It calls
* `sessionController.fork()` on that session, which cuts a new Session at the
* last completed turn, and then `sessionController.prompt()` to deliver the
* question to the new Session. That Session is an ordinary session: it inherits
* the parent's completed-turn prefix as its own log, appears in the session
* list, and can be continued or archived like any other. The answer and any
* follow-up conversation live there, never as a model-surface message of the
* receiving session.
*
* The dispatch is recorded through the command executor's own lifecycle:
* `command/run` carries the question (`recordInput: true`) and `command/done`
* carries the acknowledgement naming the forked session id. The command writes
* no plugin-owned session event type, so a reader that does not compose this
* plugin still accepts the log.
*
* The fork requires at least one completed turn: with none, the new Session
* would inherit no context. An in-progress turn does NOT refuse: the fork is
* anchored at the last completed turn, so a side question asked mid-turn forks
* from the last closed turn.
*
* @module @deepseek-ai/dsh-command-btw
*/
const USAGE = "Usage: /btw <question>";
/** The `ctx` service that forks and prompts sessions. */
const SESSION_CONTROLLER = "sessionController";
/** Library default for the optional question byte cap. */
const DEFAULT_MAX_QUESTION_BYTES = 4096;
/** Loader field schemas with library defaults. */
const ConfigFields = { maxQuestionBytes: z.number().step(1).min(1).default(DEFAULT_MAX_QUESTION_BYTES) };
z.object(ConfigFields);
const CONFIG_KEYS = /* @__PURE__ */ new Set(["maxQuestionBytes"]);
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
	return Object.freeze({ maxQuestionBytes });
}
/** The message the forked Session receives as its first prompt. */
function promptFor(question) {
	return `Answer this side question from the forked session context: ${question}`;
}
/**
* Whether the session is unsuitable to fork from: no turn has completed, so the
* new Session would inherit no context. A currently open turn is not by itself a
* refusal, because the fork is anchored at the last completed turn; an open
* FIRST turn (`turn/start` at seq 0) leaves that anchor missing.
* @param session - the session to inspect.
* @param ctx - context exposing the `turnBoundary` projection.
* @returns a human-readable reason, or undefined when the session can fork.
*/
function forkRefusalReason(ctx, session) {
	const state = ctx.sessionProjections.stateOf(session, "turnBoundary");
	if (state === void 0) return void 0;
	const firstTurnIsOpen = state.openTurnStartSeq === 0;
	if (state.lastTurn === 0 || firstTurnIsOpen) return "/btw requires at least one completed turn to fork from; finish a turn first.";
}
/** Render one thrown `/btw` failure as the command's error text. */
function failureText(stage, error) {
	return `/btw ${stage} failed: ${error instanceof Error ? error.message : String(error)}`;
}
/**
* Fork one `/btw` question into a continuation Session.
*
* The handler refuses empty or oversized questions, a session with no completed
* turn, and a profile with no session controller. It then forks the receiving
* session and delivers the question to the new session, returning an
* acknowledgement naming it.
* @param ctx - context exposing the commands, session controller, and projection services.
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
	const refusal = forkRefusalReason(ctx, session);
	if (refusal !== void 0) return {
		kind: "error",
		text: refusal
	};
	const controller = ctx.get(SESSION_CONTROLLER);
	if (controller === void 0) return {
		kind: "error",
		text: `/btw is unavailable: this profile composes no "${SESSION_CONTROLLER}" service.`
	};
	let forked;
	try {
		forked = await controller.fork({ sessionId: session.id });
	} catch (error) {
		return {
			kind: "error",
			text: failureText("fork", error)
		};
	}
	try {
		await controller.prompt({
			requestId: randomUUID(),
			sessionId: forked.sessionId,
			mode: "queue",
			content: [{
				type: "text",
				text: promptFor(question)
			}]
		}, new AbortController().signal);
	} catch (error) {
		return {
			kind: "error",
			text: failureText("prompt", error)
		};
	}
	return {
		kind: "success",
		text: startedText(forked.sessionId)
	};
}
/**
* Register the global `/btw` command for every composed command adapter.
*
* `recordInput: true` keeps the accepted question in the executor's own
* `command/run` record, so the dispatch is durable without a plugin-owned event
* type. The question is command input, never a model-surface message.
*/
function apply$1(ctx, config = {}) {
	const resolved = resolveConfig(config);
	ctx.commands.register({
		name: "btw",
		description: "by the way: fork a session to answer a side question",
		input: { hint: "<question>" },
		recordInput: true,
		handler: (invocation) => forkBtw(ctx, resolved, invocation)
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
	"sessionProjections"
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
	maxQuestionBytes: z.number().step(1).min(1).default(4096)
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
	apply$1(ctx, { ...config.maxQuestionBytes === void 0 ? {} : { maxQuestionBytes: config.maxQuestionBytes } });
}
//#endregion
export { CONTEXT_INJECTION_NAMESPACE, Config, PLUGIN_ID, apply, inject, instructionsSource, isInstructionsSource, name, registerContextInjection };
