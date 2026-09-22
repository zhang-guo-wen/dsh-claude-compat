import z from "@deepseek-ai/schemastery";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { isSkillName } from "@deepseek-ai/dsh-skill";
import { parse } from "yaml";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
import picomatch from "picomatch/posix.js";
//#region src/file-text.ts
/**
* Filesystem access shared by this plugin's loaders.
*
* Every loader prefers the harness filesystem service (`ctx.fs`) so a session's
* sandboxed view decides what is readable, and falls back to Node I/O when the
* service is absent. The helpers here centralize that preference plus the
* project-root walk, so the memory, rule, and skill loaders agree on which
* directory is the project root and on what "the file is there" means.
*
* @module @zhang-guo-wen/dsh-claude-compat/file-text
*/
/** Default directory entries that identify the project root. */
const DEFAULT_PROJECT_ROOT_MARKERS = [".git"];
/**
* Resolve the Claude Code config directory.
*
* Claude Code itself reads `$CLAUDE_CONFIG_DIR`; `$CLAUDE_HOME` is the older
* variable this plugin already honored, and `~/.claude` is the default.
* @param config - composition configuration carrying an optional explicit home.
* @returns the absolute Claude home path.
*/
function resolveClaudeHome(config) {
	return resolve(config.claudeHome ?? process.env.CLAUDE_CONFIG_DIR ?? process.env.CLAUDE_HOME ?? join(homedir(), ".claude"));
}
/**
* Walk upward from a directory to the nearest ancestor holding a root marker.
*
* A marker counts whether it is a file (a worktree's `.git` file) or a
* directory (a normal checkout's `.git`), so the walk uses `stat`.
* @param cwd - the directory to start from.
* @param markers - directory entry names that mark the project root.
* @param ctx - plugin context (uses `ctx.fs` when present).
* @returns the project root, or the resolved `cwd` when no marker is found.
*/
async function findProjectRoot(cwd, markers, ctx) {
	let current = resolve(cwd);
	for (;;) {
		for (const marker of markers) if (await pathKind(join(current, marker), ctx) !== void 0) return current;
		const parent = dirname(current);
		if (parent === current) return resolve(cwd);
		current = parent;
	}
}
/**
* What kind of entry a path is, or `undefined` when it does not exist.
* @param path - absolute path to inspect.
* @param ctx - plugin context (uses `ctx.fs` when present).
* @returns the entry kind, or `undefined` when unreadable or absent.
*/
async function pathKind(path, ctx) {
	const fs = ctx.get("fs");
	if (fs !== void 0) return await pathKindFromFs(path, fs);
	try {
		const info = await stat(path);
		if (info.isDirectory()) return "directory";
		return info.isFile() ? "file" : "other";
	} catch {
		return;
	}
}
/**
* Read a UTF-8 text file, treating every failure as absence.
* @param path - absolute path to read.
* @param ctx - plugin context (uses `ctx.fs` when present).
* @returns the file's text, or `undefined` when it is missing, unreadable, or not a file.
*/
async function readTextFile(path, ctx) {
	const fs = ctx.get("fs");
	if (fs !== void 0) return await readTextFileFromFs(path, fs);
	try {
		return await readFile(path, { encoding: "utf8" });
	} catch {
		return;
	}
}
/**
* The `file_path` a `read` tool call named, when it named one.
* @param exec - the recorded tool execution.
* @returns the trimmed path argument, or `undefined` when the call carried none.
*/
function readToolFilePath(exec) {
	if (typeof exec.arguments !== "object" || exec.arguments === null) return void 0;
	if (!("file_path" in exec.arguments) || typeof exec.arguments.file_path !== "string") return void 0;
	const path = exec.arguments.file_path.trim();
	return path.length > 0 ? path : void 0;
}
/**
* Convert a path to forward slashes for display and glob matching.
* @param path - any platform's path text.
* @returns the same path with backslashes replaced.
*/
function pathToPosix(path) {
	return path.split("\\").join("/");
}
async function pathKindFromFs(path, fs) {
	try {
		const target = await fs.resolve(path);
		return (await fs.stat(target))?.type;
	} catch {
		return;
	}
}
async function readTextFileFromFs(path, fs) {
	try {
		const target = await fs.resolve(path);
		const info = await fs.stat(target);
		if (info === void 0 || info.type !== "file") return void 0;
		return await fs.readText(target);
	} catch {
		return;
	}
}
//#endregion
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
		this.claudeHome = resolveClaudeHome(config);
		this.projectRootMarkers = config.projectRootMarkers ?? [...DEFAULT_PROJECT_ROOT_MARKERS];
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
			const projectRoot = await findProjectRoot(resolve(cwd), this.projectRootMarkers, this.ctx);
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
//#endregion
//#region src/render.ts
/**
* Render instruction blocks under an aggregate byte budget.
*
* The first block is always included — its own per-source cap bounds it — and
* later blocks are added only while the complete rendered value stays within
* `maxBytes`, so the budget bounds the whole message rather than each part.
* @param blocks - the blocks to render, in model precedence order.
* @param maxBytes - aggregate UTF-8 byte cap; zero or a non-finite value disables it.
* @returns the rendered text.
*/
function renderInstructionBlocks(blocks, maxBytes) {
	const parts = [];
	let bytes = 0;
	for (const block of blocks) {
		const part = `Instructions from: ${block.displayPath}\n\n${block.content}`;
		const partBytes = byteLength((parts.length === 0 ? "" : "\n\n") + part);
		if (parts.length > 0 && maxBytes > 0 && Number.isFinite(maxBytes) && bytes + partBytes > maxBytes) break;
		parts.push(part);
		bytes += partBytes;
	}
	return parts.join("\n\n");
}
/**
* UTF-8 byte length of a string.
* @param text - the text to measure.
* @returns its length in bytes.
*/
function byteLength(text) {
	return Buffer.byteLength(text, "utf8");
}
/**
* Truncate text to a UTF-8 byte budget on a character boundary.
* @param text - the text to truncate.
* @param maxBytes - the byte budget; the whole text is returned when it fits.
* @returns the longest prefix that fits without splitting a character.
*/
function truncateToBytes(text, maxBytes) {
	const buffer = Buffer.from(text, "utf8");
	if (buffer.length <= maxBytes) return text;
	let end = Math.max(0, maxBytes);
	while (end > 0 && (buffer[end] & 192) === 128) end -= 1;
	return buffer.subarray(0, end).toString("utf8");
}
/** Filename of the auto-memory index inside a project's memory directory. */
const AUTO_MEMORY_INDEX_NAME = "MEMORY.md";
/** Bytes of the auto-memory index Claude Code loads at session start. */
const AUTO_MEMORY_INDEX_BYTES = 25600;
/** The project memory file name, at the directory and inside its `.claude` directory. */
const MEMORY_FILE_NAME = "CLAUDE.md";
/** The personal project memory file name, loaded after the base file in its directory. */
const LOCAL_MEMORY_FILE_NAME = "CLAUDE.local.md";
/**
* The managed-policy memory file for a platform.
* @param platform - the Node platform name; defaults to the running one.
* @returns the absolute policy path Claude Code reads on that platform.
*/
function defaultManagedMemoryPath(platform = process.platform) {
	if (platform === "win32") return "C:\\Program Files\\ClaudeCode\\CLAUDE.md";
	if (platform === "darwin") return "/Library/Application Support/ClaudeCode/CLAUDE.md";
	return "/etc/claude-code/CLAUDE.md";
}
/**
* Read the session-start memory batch for a working directory.
*
* Order runs broad to specific, matching Claude Code: managed policy, user,
* the project chain from the project root down to `cwd` (each directory's
* `CLAUDE.md`, `.claude/CLAUDE.md`, then `CLAUDE.local.md`), then the
* auto-memory index. Missing and unreadable files are skipped, never fatal.
* @param cwd - absolute session working directory.
* @param ctx - plugin context (uses `ctx.fs` when present).
* @param config - home, root markers, file selection, and byte budgets.
* @returns the memory files that exist, in load order.
*/
async function loadClaudeMemory(cwd, ctx, config = {}) {
	const state = { visited: /* @__PURE__ */ new Set() };
	const files = [];
	if (config.includeManagedMemory !== false) {
		const path = config.managedMemoryPath ?? defaultManagedMemoryPath();
		await pushMemoryFile(files, path, path, ctx, config, state);
	}
	if (config.includeGlobalRule !== false) await pushMemoryFile(files, join(resolveClaudeHome(config), MEMORY_FILE_NAME), `~/.claude/${MEMORY_FILE_NAME}`, ctx, config, state);
	if (config.includeProjectRule !== false) {
		const projectRoot = await findProjectRoot(cwd, config.projectRootMarkers ?? DEFAULT_PROJECT_ROOT_MARKERS, ctx);
		for (const directory of directoryChain(projectRoot, resolve(cwd))) for (const candidate of claudeMemoryCandidates(directory, pathToPosix(relative(projectRoot, directory)))) await pushMemoryFile(files, candidate.absolutePath, candidate.displayPath, ctx, config, state);
	}
	if (config.includeAutoMemory !== false) {
		const path = join(await resolveAutoMemoryDirectory(cwd, ctx, config), AUTO_MEMORY_INDEX_NAME);
		const raw = await readTextFile(path, ctx);
		if (raw !== void 0) files.push({
			absolutePath: path,
			displayPath: path,
			content: capAutoMemoryIndex(raw)
		});
	}
	return files;
}
/**
* Read the memory files of the directories a read reached into.
*
* Every directory between `cwd` and the read file contributes the same
* candidate set the session-start chain uses.
* @param cwd - absolute session working directory.
* @param readPaths - `file_path` arguments of the `read` calls to resolve.
* @param ctx - plugin context (uses `ctx.fs` when present).
* @param config - home, root markers, file selection, and byte budgets.
* @returns the nested memory files that exist, deduplicated by display path.
*/
async function loadNestedMemory(cwd, readPaths, ctx, config = {}) {
	if (config.includeNestedMemory === false) return [];
	const base = resolve(cwd);
	const state = { visited: /* @__PURE__ */ new Set() };
	const files = [];
	const seen = /* @__PURE__ */ new Set();
	for (const readPath of readPaths) {
		const absolute = isAbsolute(readPath) ? resolve(readPath) : resolve(base, readPath);
		const prefix = pathToPosix(relative(base, absolute));
		if (prefix.length === 0 || prefix === ".." || prefix.startsWith("../") || isAbsolute(prefix)) continue;
		for (const directory of directoryChain(base, dirname(absolute)).slice(1)) for (const candidate of claudeMemoryCandidates(directory, pathToPosix(relative(base, directory)))) {
			if (seen.has(candidate.displayPath)) continue;
			seen.add(candidate.displayPath);
			await pushMemoryFile(files, candidate.absolutePath, candidate.displayPath, ctx, config, state);
		}
	}
	return files;
}
/**
* The memory files one directory contributes, in Claude Code's load order.
*
* A directory's base file is `CLAUDE.md`, or `.claude/CLAUDE.md`; both load when
* both exist. Its personal overlay `CLAUDE.local.md` loads after them, so
* personal notes are the last thing read at that level.
* @param directory - absolute directory to name candidates in.
* @param prefix - the directory's model-facing path relative to the load base; empty at the base itself.
* @returns that directory's candidates in load order.
*/
function claudeMemoryCandidates(directory, prefix) {
	const display = (name) => prefix.length === 0 ? name : `${prefix}/${name}`;
	return [
		{
			absolutePath: join(directory, MEMORY_FILE_NAME),
			displayPath: display(MEMORY_FILE_NAME)
		},
		{
			absolutePath: join(directory, ".claude", MEMORY_FILE_NAME),
			displayPath: display(`.claude/${MEMORY_FILE_NAME}`)
		},
		{
			absolutePath: join(directory, LOCAL_MEMORY_FILE_NAME),
			displayPath: display(LOCAL_MEMORY_FILE_NAME)
		}
	];
}
/**
* Resolve the directory Claude Code keeps a project's auto memory in.
*
* Claude Code derives the directory name from the git repository, so every
* worktree and subdirectory of one repository shares a memory directory;
* outside a repository the project root itself names it. A configured
* `autoMemoryDirectory` wins over the derived path.
* @param cwd - absolute session working directory.
* @param ctx - plugin context (uses `ctx.fs` when present).
* @param config - home, root markers, and the optional directory override.
* @returns the absolute auto-memory directory (which need not exist).
*/
async function resolveAutoMemoryDirectory(cwd, ctx, config = {}) {
	if (config.autoMemoryDirectory !== void 0) return resolve(config.autoMemoryDirectory);
	const repository = await resolveRepositoryRoot(await findProjectRoot(cwd, config.projectRootMarkers ?? DEFAULT_PROJECT_ROOT_MARKERS, ctx), ctx);
	return join(resolveClaudeHome(config), "projects", projectSlug(repository), "memory");
}
/**
* Claude Code's project-directory name for a path: every character outside
* `[A-Za-z0-9]` becomes `-` (`C:\src\app` becomes `C--src-app`).
* @param path - the absolute repository or project root path.
* @returns the directory name Claude Code uses under `<claude home>/projects`.
*/
function projectSlug(path) {
	return path.replace(/[^A-Za-z0-9]/g, "-");
}
/**
* Strip block-level HTML comments from a memory file.
*
* A comment that occupies whole lines is removed; one embedded in prose is
* kept, and so is any comment inside a fenced code block. An unterminated
* comment is left in place rather than swallowing the rest of the file.
* @param text - the memory file body.
* @returns the body without block-level HTML comments.
*/
function stripBlockHtmlComments(text) {
	return splitFencedRuns(text).map((run) => run.code ? run.text : run.text.replace(/^[ \t\r]*<!--[\s\S]*?-->[ \t\r]*\n?/gm, "")).join("");
}
/**
* Expand `@path` imports in place.
*
* A token is an import when its `@` starts a line or follows whitespace and the
* resolved path names a readable file; anything else stays literal, which keeps
* an `@mention` or an email address untouched. Relative paths resolve against
* the importing file. Each file expands at most once per batch, so a repeated
* or circular import stays literal instead of duplicating content.
* @param text - the memory file body.
* @param filePath - absolute path of the file the text came from.
* @param ctx - plugin context (uses `ctx.fs` when present).
* @param config - byte budgets and the import depth.
* @param state - the batch's already-expanded files.
* @param depth - hops already followed from the batch's first file.
* @returns the body with every resolvable import replaced by its content.
*/
async function expandMemoryImports(text, filePath, ctx, config, state, depth) {
	if (depth >= (config.maxImportDepth ?? 4)) return text;
	const parts = [];
	let cursor = 0;
	for (const match of maskCodeRegions(text).matchAll(IMPORT_PATTERN)) {
		const token = match[1];
		const at = match.index + match[0].length - token.length - 1;
		const target = token.replace(TRAILING_PUNCTUATION, "");
		if (target.length === 0) continue;
		const content = await readImportedFile(target, filePath, ctx, config, state, depth);
		if (content === void 0) continue;
		parts.push(text.slice(cursor, at), content);
		cursor = at + 1 + target.length;
	}
	if (cursor === 0) return text;
	parts.push(text.slice(cursor));
	return parts.join("");
}
/** A candidate import: `@` at a line start or after whitespace. */
const IMPORT_PATTERN = /(?:^|\s)@([^\s`]+)/g;
/** Punctuation a path token never ends with in prose. */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}>'"”’]+$/;
/** A fenced code block's opening or closing run. */
const FENCE_PATTERN = /^[ \t\r]*(`{3,}|~{3,})/;
async function pushMemoryFile(files, path, displayPath, ctx, config, state) {
	const maxSourceBytes = config.maxMemorySourceBytes ?? 4194304;
	const raw = await readTextFile(path, ctx);
	if (raw === void 0 || byteLength(raw) > maxSourceBytes) return;
	state.visited.add(resolve(path));
	files.push({
		absolutePath: path,
		displayPath,
		content: await expandMemoryImports(stripBlockHtmlComments(raw), path, ctx, config, state, 0)
	});
}
async function readImportedFile(token, filePath, ctx, config, state, depth) {
	const path = resolveImportedPath(token, filePath);
	if (path === void 0 || state.visited.has(path)) return void 0;
	const raw = await readTextFile(path, ctx);
	if (raw === void 0 || byteLength(raw) > (config.maxMemorySourceBytes ?? 4194304)) return void 0;
	state.visited.add(path);
	return await expandMemoryImports(stripBlockHtmlComments(raw), path, ctx, config, state, depth + 1);
}
function resolveImportedPath(token, filePath) {
	if (token === "~") return resolve(homedir());
	if (token.startsWith("~/") || token.startsWith("~\\")) return resolve(homedir(), token.slice(2));
	const path = isAbsolute(token) ? resolve(token) : resolve(dirname(filePath), token);
	return path.length === 0 ? void 0 : path;
}
/** Keep an auto-memory index within the lines and bytes Claude Code loads. */
function capAutoMemoryIndex(text) {
	const lines = text.split("\n");
	return truncateToBytes(lines.length <= 200 ? text : lines.slice(0, 200).join("\n"), AUTO_MEMORY_INDEX_BYTES);
}
/** Directories from an ancestor down to a descendant, inclusive. */
function directoryChain(ancestor, descendant) {
	const chain = [];
	let current = resolve(descendant);
	const stop = resolve(ancestor);
	for (;;) {
		chain.push(current);
		if (current === stop) break;
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}
	return chain.reverse();
}
/**
* The repository a project root belongs to.
*
* A `.git` directory means the project root is itself the repository. A `.git`
* file names a git directory — `<repo>/.git/worktrees/<name>` for a linked
* worktree — from which the main repository path is recovered so worktrees
* share one auto-memory directory.
*/
async function resolveRepositoryRoot(projectRoot, ctx) {
	const gitPath = join(projectRoot, ".git");
	if (await pathKind(gitPath, ctx) !== "file") return projectRoot;
	const text = await readTextFile(gitPath, ctx);
	const match = text === void 0 ? null : /^gitdir:[ \t]*(.+?)[ \t\r]*$/m.exec(text);
	if (match === null) return projectRoot;
	const worktree = /^(.*)[\\/]\.git[\\/]worktrees[\\/][^\\/]+$/.exec(resolve(projectRoot, match[1]));
	return worktree === null ? projectRoot : worktree[1];
}
/** Split a document into fenced-code and prose runs; the runs rejoin to the input. */
function splitFencedRuns(text) {
	const lines = text.split("\n");
	const starts = [];
	let offset = 0;
	for (const line of lines) {
		starts.push(offset);
		offset += line.length + 1;
	}
	const code = fencedLineFlags(lines);
	const runs = [];
	let index = 0;
	while (index < lines.length) {
		let end = index;
		while (end + 1 < lines.length && code[end + 1] === code[index]) end += 1;
		const from = starts[index];
		const to = end + 1 < lines.length ? starts[end + 1] : text.length;
		runs.push({
			text: text.slice(from, to),
			code: code[index]
		});
		index = end + 1;
	}
	return runs;
}
/** Whether each line sits inside a fenced code block (or opens or closes one). */
function fencedLineFlags(lines) {
	const flags = [];
	let fence;
	for (const line of lines) {
		const match = FENCE_PATTERN.exec(line);
		if (fence !== void 0) {
			flags.push(true);
			if (match !== null && match[1][0] === fence[0] && match[1].length >= fence.length) fence = void 0;
			continue;
		}
		if (match !== null) {
			fence = match[1];
			flags.push(true);
			continue;
		}
		flags.push(false);
	}
	return flags;
}
/** Blank fenced code blocks and inline code spans so imports inside them do not match. */
function maskCodeRegions(text) {
	return splitFencedRuns(text).map((run) => run.code ? " ".repeat(run.text.length) : run.text.replace(/`[^`\n]*`/g, (m) => " ".repeat(m.length))).join("");
}
//#endregion
//#region src/sources.ts
/** Package identity recorded on every injected message this plugin produces. */
const PLUGIN_ID = "@zhang-guo-wen/dsh-claude-compat";
/** One contributor's source: its own kind and the instructions form. */
const INSTRUCTIONS_SOURCES = {
	"claude-code": {
		kind: "plugin:@zhang-guo-wen/dsh-claude-compat#claude-code",
		form: "instructions"
	},
	"claude-memory": {
		kind: "plugin:@zhang-guo-wen/dsh-claude-compat#claude-memory",
		form: "instructions"
	},
	"claude-rule": {
		kind: "plugin:@zhang-guo-wen/dsh-claude-compat#claude-rule",
		form: "instructions"
	}
};
/**
* The source for one contributor's injected instructions.
* @param loader - contributor that produced the content.
* @returns an instructions-form model source owned by this plugin.
*/
function instructionsSource(loader) {
	return { ...INSTRUCTIONS_SOURCES[loader] };
}
/**
* Whether one logged message source came from this plugin's `<loader>`
* contributor.
*
* The contributors ask this of a session log to avoid folding the same rules in
* twice. Every shape this package has ever written answers yes: the current
* producer-owned kind, the generic `plugin` wrapper it replaced, and the two
* bespoke kinds written before either. Reading the retired names back never
* writes them again — it only keeps a resumed Session that already carries the
* content from receiving it a second time.
* @param source - a logged message's `source` value, of unknown provenance.
* @param loader - contributor whose earlier injection is being looked for.
* @returns whether that contributor already supplied instructions here.
*/
function isInstructionsSource(source, loader) {
	if (typeof source !== "object" || source === null) return false;
	const kind = source.kind;
	if (kind === loader) return true;
	if (kind === `plugin:@zhang-guo-wen/dsh-claude-compat#${loader}`) return true;
	return kind === "plugin" && source.plugin === `@zhang-guo-wen/dsh-claude-compat#${loader}`;
}
//#endregion
//#region src/instructions.ts
/** The `read` tool name that triggers a directory's memory. */
const READ_TOOL_NAME$1 = "read";
/** Loader that produced the session-start memory batch. */
const BASELINE_LOADER = "claude-code";
/** Loader that produced a directory's memory. */
const NESTED_LOADER = "claude-memory";
/** The loaders whose already-folded content this module tracks. */
const TRACKED_LOADERS = [BASELINE_LOADER, NESTED_LOADER];
/** The header each injected block carries, read back to see what a session already folded. */
const INSTRUCTIONS_HEADER = /^Instructions from: (.+?)[ \t\r]*$/gm;
/**
* Message source kind the Harness's own workspace-instruction loader records.
* Typed as `string` because this package does not depend on the loader's type
* declarations, so the merged source union here has no member for it.
*/
const HARNESS_INSTRUCTIONS_KIND = "agent-instructions";
/** One file's section inside a Harness workspace-instructions message. */
const HARNESS_SECTION_HEADER = /^(?:Additional instructions from|Updated instructions from|Instructions from|Instructions removed): (.+?)[ \t\r]*$/gm;
/** The memory file names this plugin owns, in any directory. */
const OWNED_MEMORY_NAMES = ["CLAUDE.md", "CLAUDE.local.md"];
/**
* Discover and read the Claude Code memory files for a workspace.
* @param cwd - absolute session working directory.
* @param ctx - plugin context (uses `ctx.fs` when present).
* @param config - home, root markers, file selection, and byte budgets.
* @returns the combined context, or `undefined` when no memory file loaded.
*/
async function loadClaudeInstructions(cwd, ctx, config = {}) {
	const files = await loadClaudeMemory(cwd, ctx, config);
	if (files.length === 0) return void 0;
	return {
		text: renderInstructionBlocks(files, config.maxMemoryRenderBytes ?? 262144),
		files
	};
}
/**
* Remove this plugin's memory files from the Harness loader's messages.
*
* A section is removed when its header names `CLAUDE.md` or `CLAUDE.local.md`
* in any directory; every other section, the message's intro, and its budget
* marker stay. A message left with an empty frame carries no content at all and
* is dropped, which keeps the request free of an empty `<system-reminder>`.
*
* Removing the sections while keeping the message's source is what tells the
* Harness loader the baseline is still present: it confirms a baseline by
* message identity, so a rewritten message is not re-composed on the next step.
* @param decision - the entering decision to amend.
* @returns the decision with those sections removed, or the original when it carries none.
*/
function stripHarnessClaudeMemory(decision) {
	let changed = false;
	const messages = [];
	for (const message of decision.messages) {
		if (message.source.kind !== HARNESS_INSTRUCTIONS_KIND) {
			messages.push(message);
			continue;
		}
		const content = [];
		let stripped = false;
		for (const block of message.content) {
			if (block.type !== "text") {
				content.push(block);
				continue;
			}
			const body = stripOwnedSections(block.text);
			if (body === void 0) {
				stripped = true;
				continue;
			}
			if (body !== block.text) stripped = true;
			content.push({
				...block,
				text: body
			});
		}
		if (!stripped) {
			messages.push(message);
			continue;
		}
		changed = true;
		if (content.length > 0) messages.push({
			...message,
			content
		});
	}
	return changed ? {
		...decision,
		messages
	} : decision;
}
/**
* Fold the session-start memory into an entering step, mirroring `agent-instructions`.
* @param decision - the pre-step decision to amend.
* @param context - the rendered memory context to fold in.
* @returns the amended decision.
*/
function injectIntoFirstRequest(decision, context) {
	return injectMemoryIntoRequest(decision, context.text, BASELINE_LOADER, true);
}
/**
* Fold rendered memory text into an entering step.
* @param decision - the pre-step decision to amend.
* @param text - the rendered memory context to fold in.
* @param loader - contributor that produced the text.
* @param requireMessages - when true, a step carrying no newly claimed message is left alone.
* @returns the amended decision.
*/
function injectMemoryIntoRequest(decision, text, loader, requireMessages) {
	if (requireMessages && decision.messages.length === 0) return decision;
	return {
		...decision,
		messages: foldContext(decision.messages, text, loader)
	};
}
/**
* Insert the injected memory after the last admitted user message.
* @param messages - the messages to amend.
* @param text - the rendered memory context to insert.
* @param loader - contributor to record on the folded message.
* @returns the amended message array.
*/
function foldContext(messages, text, loader = BASELINE_LOADER) {
	const message = createUserMessage({
		content: [{
			type: "text",
			text
		}],
		source: instructionsSource(loader)
	});
	const lastIndex = messages.findLastIndex((m) => m.role === "user");
	if (lastIndex < 0) return [...messages, message];
	return messages.toSpliced(lastIndex + 1, 0, message);
}
/**
* Register the Claude Code memory listeners: an `agent/pre-step` listener that
* folds the session-start batch and each read directory's memory, plus a
* `tools/result` listener that records which files were read.
* @param ctx - plugin context.
* @param config - home, root markers, file selection, and byte budgets.
* @param isEnabled - thunk returning whether Claude memory injection is on.
*/
function claudeInstructionListener(ctx, config = {}, isEnabled = () => true) {
	const states = /* @__PURE__ */ new WeakMap();
	ctx.on("agent/pre-step", async ({ agent, signal }, next) => {
		const decision = await next();
		if (!isEnabled()) return decision;
		if (decision.kind === "reject") return decision;
		const session = agent.session;
		if (session === void 0) return decision;
		let amended = config.takeOverClaudeMd === false ? decision : stripHarnessClaudeMemory(decision);
		const folded = foldedInstructionPaths(session, amended.messages);
		if (!folded.has(BASELINE_LOADER)) {
			if (amended.messages.length === 0) return amended;
			const cwd = session.header?.cwd;
			if (cwd === void 0) return amended;
			const context = await loadClaudeInstructions(cwd, ctx, config);
			signal.throwIfAborted();
			if (context !== void 0) amended = injectIntoFirstRequest(amended, context);
		}
		const state = ensureMemoryState(session, states);
		if (state.reads.size === 0) return amended;
		const reads = [...state.reads];
		state.reads.clear();
		const cwd = session.header?.cwd;
		if (cwd === void 0) return amended;
		const alreadyFolded = folded.get(NESTED_LOADER) ?? /* @__PURE__ */ new Set();
		const files = (await loadNestedMemory(cwd, reads, ctx, config)).filter((file) => !alreadyFolded.has(file.displayPath));
		signal.throwIfAborted();
		if (files.length === 0) return amended;
		const text = renderInstructionBlocks(files, config.maxMemoryRenderBytes ?? 262144);
		return injectMemoryIntoRequest(amended, text, NESTED_LOADER, false);
	});
	ctx.on("tools/result", (exec, result) => {
		if (!isEnabled() || result.isError || exec.name !== READ_TOOL_NAME$1 || exec.agent === void 0) return;
		const session = exec.agent.session;
		if (session === void 0) return;
		const filePath = readToolFilePath(exec);
		if (filePath !== void 0) ensureMemoryState(session, states).reads.add(filePath);
	});
}
function ensureMemoryState(session, states) {
	let state = states.get(session);
	if (state === void 0) {
		state = { reads: /* @__PURE__ */ new Set() };
		states.set(session, state);
	}
	return state;
}
/**
* The display paths each tracked loader already has on the model-visible
* surface or in the entering batch, keyed by loader.
*
* Reading the surface rather than the complete event log is what makes a
* compacted-away memory message fold again: a shadowed message is no longer in
* the derived history, while the log it came from still is.
* @param session - the session whose visible history is inspected.
* @param messages - the entering batch, whose injections are not committed yet.
* @returns a set of display paths per loader, present for every loader with a message.
*/
function foldedInstructionPaths(session, messages) {
	const found = /* @__PURE__ */ new Map();
	const visible = [...session.deriveMessages(), ...messages];
	for (const message of visible) {
		if (message.role !== "user") continue;
		for (const loader of TRACKED_LOADERS) {
			if (!isInstructionsSource(message.source, loader)) continue;
			const paths = found.get(loader) ?? /* @__PURE__ */ new Set();
			for (const block of message.content) {
				if (block.type !== "text") continue;
				for (const match of block.text.matchAll(INSTRUCTIONS_HEADER)) paths.add(match[1]);
			}
			found.set(loader, paths);
		}
	}
	return found;
}
/** Remove the sections naming an owned memory file; `undefined` when no content would remain. */
function stripOwnedSections(text) {
	const matches = [...text.matchAll(HARNESS_SECTION_HEADER)];
	if (!matches.some((match) => isOwnedMemoryPath(match[1]))) return text;
	const kept = [];
	let cursor = 0;
	for (const [index, match] of matches.entries()) {
		if (!isOwnedMemoryPath(match[1])) continue;
		const start = match.index ?? 0;
		const next = matches[index + 1];
		kept.push(text.slice(cursor, start));
		cursor = next === void 0 ? text.length : next.index ?? text.length;
	}
	kept.push(text.slice(cursor));
	const stripped = kept.join("");
	return frameBody(stripped).trim().length > 0 ? stripped : void 0;
}
/** Whether a section's model-facing path names a memory file this plugin owns. */
function isOwnedMemoryPath(displayPath) {
	const name = displayPath.split(/[\\/]/).pop() ?? "";
	return OWNED_MEMORY_NAMES.includes(name);
}
/** The instructions message body, with its `<system-reminder>` frame markers removed. */
function frameBody(text) {
	return text.replaceAll("<system-reminder>", "").replaceAll("</system-reminder>", "");
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
	const claudeHome = resolveClaudeHome(config);
	const markers = config.projectRootMarkers ?? DEFAULT_PROJECT_ROOT_MARKERS;
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
	return renderInstructionBlocks(rules, maxBytes);
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
					const filePath = readToolFilePath(exec);
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
async function readRuleFile(path, displayPath, maxSourceBytes, ctx) {
	const raw = await readTextFile(path, ctx);
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
//#endregion
//#region src/context-injection.ts
/** Settings namespace owned by this plugin: its Loader row id. */
const CONTEXT_INJECTION_NAMESPACE = "claude-compat";
/** Schema served to settings clients for the injection preferences.
* The inferred type is the source of truth: `.volatile()` produces the `Volatile` accessors above. */
const CONTEXT_INJECTION_SCHEMA = z.object({
	skills: z.boolean().default(true).volatile(),
	rules: z.boolean().default(true).volatile(),
	memory: z.boolean().default(true).volatile()
});
/**
* Read the three switches as plain values.
*
* The contributors call the returned thunk per request, so a committed change
* needs no listener and no re-registration.
* @param config - the plugin's resolved configuration.
* @returns a thunk returning the switches as they stand at call time.
*/
function contextInjectionFlags(config) {
	return () => ({
		skills: config.skills.get(),
		rules: config.rules.get(),
		memory: config.memory.get()
	});
}
//#endregion
//#region src/index.ts
/** Cordis plugin name used by loader diagnostics. */
const name = "claude-compat";
/** Services required by this plugin; the settings page is served from the row Config. */
const inject = ["skills"];
const Config = z.object({
	providerName: z.string().min(1).default("claude-code"),
	claudeHome: z.string(),
	projectRootMarkers: z.array(z.string()).default([".git"]),
	includeProjectRoot: z.boolean().default(true),
	includeGlobalRoot: z.boolean().default(true),
	includeProjectRule: z.boolean().default(true),
	includeGlobalRule: z.boolean().default(true),
	includeProjectRules: z.boolean().default(true),
	includeGlobalRules: z.boolean().default(true),
	includeNestedMemory: z.boolean().default(true),
	includeManagedMemory: z.boolean().default(true),
	managedMemoryPath: z.string(),
	includeAutoMemory: z.boolean().default(true),
	autoMemoryDirectory: z.string(),
	takeOverClaudeMd: z.boolean().default(true),
	maxRuleSourceBytes: z.number().step(1).min(1).default(1048576),
	maxRuleRenderBytes: z.number().step(1).min(0).default(262144),
	maxMemorySourceBytes: z.number().step(1).min(1).default(4194304),
	maxMemoryRenderBytes: z.number().step(1).min(0).default(262144),
	maxImportDepth: z.number().step(1).min(0).default(4),
	...CONTEXT_INJECTION_SCHEMA.dict
});
/**
* Copy the configuration fields a listener reads, skipping the ones this
* composition left unset: under `exactOptionalPropertyTypes` an optional
* property does not accept an explicitly `undefined` value.
* @param source - the plugin's validated configuration.
* @param keys - the fields that listener owns.
* @returns those fields, each present only when it has a value.
*/
function pickDefined(source, keys) {
	const picked = {};
	for (const key of keys) {
		const value = source[key];
		if (value !== void 0) picked[key] = value;
	}
	return picked;
}
/**
* Register the Claude Code skill provider and the memory and scoped-rule
* contributors. Each of the three follows its own live settings switch.
* @param ctx - plugin context.
* @param config - the row's resolved configuration.
*/
async function apply(ctx, config) {
	const flags = contextInjectionFlags(config);
	ctx.skills.registerProvider((control) => new ClaudeCodeSkillProvider(ctx, control, {
		...config,
		enabled: () => flags().skills
	}));
	claudeInstructionListener(ctx, pickDefined(config, [
		"claudeHome",
		"projectRootMarkers",
		"includeProjectRule",
		"includeGlobalRule",
		"includeNestedMemory",
		"includeManagedMemory",
		"managedMemoryPath",
		"includeAutoMemory",
		"autoMemoryDirectory",
		"takeOverClaudeMd",
		"maxMemorySourceBytes",
		"maxMemoryRenderBytes",
		"maxImportDepth"
	]), () => flags().memory);
	claudeRulesListener(ctx, pickDefined(config, [
		"claudeHome",
		"projectRootMarkers",
		"includeProjectRules",
		"includeGlobalRules",
		"maxRuleSourceBytes",
		"maxRuleRenderBytes"
	]), () => flags().rules);
}
//#endregion
export { CONTEXT_INJECTION_NAMESPACE, CONTEXT_INJECTION_SCHEMA, Config, PLUGIN_ID, apply, contextInjectionFlags, inject, instructionsSource, isInstructionsSource, name };
