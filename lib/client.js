window.__ModuleLoader__.load({
	id: "@guowenzhang/dsh-claude-compat",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region \0dsh-css:C:\02-codespace\DeepSeek\dsh-claude-compat\src\client\ContextInjectionSection.module.css.mjs
		const css = ".gwIBsa_section{flex-direction:column;gap:16px;width:100%;max-width:720px;display:flex}.gwIBsa_panel{flex-direction:column;gap:16px;display:flex}.gwIBsa_intro{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;white-space:pre-line;border-radius:12px;margin:0;padding:14px 16px;font-size:13px;line-height:22px}.gwIBsa_switchSectionLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);margin:4px 0 0;font-size:11px;font-weight:600}.gwIBsa_switchRow{flex-direction:column;gap:10px;padding:12px 0;display:flex}.gwIBsa_switchHead{justify-content:space-between;align-items:flex-start;gap:16px;display:flex}.gwIBsa_switchText{flex-direction:column;gap:2px;min-width:0;display:flex}.gwIBsa_switchLabel{font-size:13px;font-weight:600}.gwIBsa_switchDesc{color:var(--dsw-alias-label-secondary);font-size:12px}.gwIBsa_compatList{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}.gwIBsa_compatItem{border-left:2px solid var(--dsw-alias-border-l2);flex-direction:column;gap:1px;padding-left:10px;display:flex}.gwIBsa_compatTitle{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600}.gwIBsa_compatDetail{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;font-size:11.5px;line-height:17px}.gwIBsa_unavailable{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}";
		const tagId = "@guowenzhang/dsh-claude-compat/ContextInjectionSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ContextInjectionSection_module_css_default = {
			"compatDetail": "gwIBsa_compatDetail",
			"compatItem": "gwIBsa_compatItem",
			"compatList": "gwIBsa_compatList",
			"compatTitle": "gwIBsa_compatTitle",
			"intro": "gwIBsa_intro",
			"panel": "gwIBsa_panel",
			"section": "gwIBsa_section",
			"switchDesc": "gwIBsa_switchDesc",
			"switchHead": "gwIBsa_switchHead",
			"switchLabel": "gwIBsa_switchLabel",
			"switchRow": "gwIBsa_switchRow",
			"switchSectionLabel": "gwIBsa_switchSectionLabel",
			"switchText": "gwIBsa_switchText",
			"unavailable": "gwIBsa_unavailable"
		};
		//#endregion
		//#region src/client/ContextInjectionSection.tsx
		/** The switches, in the order the page presents them. */
		const COMPAT_SWITCHES = [
			{
				name: "skills",
				label: "skills",
				desc: "skills.desc",
				entries: [{
					title: "skills.entry",
					detail: "skills.entry.detail"
				}]
			},
			{
				name: "memory",
				label: "memory",
				desc: "memory.desc",
				entries: [
					{
						title: "memory.files",
						detail: "memory.files.detail"
					},
					{
						title: "memory.auto",
						detail: "memory.auto.detail"
					},
					{
						title: "memory.nested",
						detail: "memory.nested.detail"
					},
					{
						title: "memory.imports",
						detail: "memory.imports.detail"
					}
				]
			},
			{
				name: "memoryWrite",
				label: "memoryWrite",
				desc: "memoryWrite.desc",
				entries: [{
					title: "memoryWrite.files",
					detail: "memoryWrite.files.detail"
				}]
			},
			{
				name: "rules",
				label: "rules",
				desc: "rules.desc",
				entries: [{
					title: "rules.entry",
					detail: "rules.entry.detail"
				}]
			}
		];
		/** The settings section body. */
		function ContextInjectionSection(props) {
			const { useContextInjection, t, toggle } = props;
			const state = useContextInjection((snapshot) => snapshot);
			const disabled = !state.available || !state.writable;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ContextInjectionSection_module_css_default.section,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ContextInjectionSection_module_css_default.panel,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.intro,
							children: t("intro")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ContextInjectionSection_module_css_default.switchSectionLabel,
							children: t("switchSection")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: COMPAT_SWITCHES.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ContextInjectionSection_module_css_default.switchRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ContextInjectionSection_module_css_default.switchHead,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: ContextInjectionSection_module_css_default.switchText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ContextInjectionSection_module_css_default.switchLabel,
										children: t(entry.label)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ContextInjectionSection_module_css_default.switchDesc,
										children: t(entry.desc)
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
									checked: entry.name === "memoryWrite" ? state.memory && state.memoryWrite : state[entry.name],
									onChange: () => {
										toggle(entry.name);
									},
									label: t(entry.label),
									disabled: disabled || entry.name === "memoryWrite" && !state.memory,
									title: disabled ? t("unavailable") : entry.name === "memoryWrite" && !state.memory ? t("memoryWrite.requiresMemory") : void 0
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: ContextInjectionSection_module_css_default.compatList,
								children: entry.entries.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									className: ContextInjectionSection_module_css_default.compatItem,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ContextInjectionSection_module_css_default.compatTitle,
										children: t(item.title)
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ContextInjectionSection_module_css_default.compatDetail,
										children: t(item.detail)
									})]
								}, item.title))
							})]
						}, entry.name)) }),
						!state.available ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.unavailable,
							children: t("unavailable")
						}) : null
					]
				})
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Context-injection settings section dictionaries.
		*
		* Every switch names what it loads and when, so the page answers "which Claude
		* Code rules are compatible?" without reading the README. Each key of the
		* Chinese dictionary is part of {@link ContextInjectionSectionKey}, and `en` is
		* typed against it, so a new entry cannot ship untranslated.
		*
		* @module @guowenzhang/dsh-claude-compat/client/locales
		*/
		/** Locale namespace owned by this plugin. */
		const NS = "settings.contextInjection";
		const zh = {
			"nav": "Claude 兼容",
			"intro": "加载 Claude Code 的技能、记忆文件与作用域规则，也可独立开启自动记忆写入。",
			"switchSection": "兼容开关",
			"skills": "加载技能",
			"skills.desc": "把项目与全局的 Claude Code 技能加进会话技能目录",
			"skills.entry": "技能目录",
			"skills.entry.detail": ".claude/skills/**、~/.claude/skills/** —— 会话开始时进入技能目录，模型按名调用",
			"memory": "加载记忆",
			"memory.desc": "把 Claude Code 的 CLAUDE.md 记忆文件与自动记忆注入会话",
			"memory.files": "记忆文件",
			"memory.files.detail": "托管策略 CLAUDE.md、~/.claude/CLAUDE.md、项目根到工作目录每一层的 CLAUDE.md、.claude/CLAUDE.md 与 CLAUDE.local.md —— 会话开始时注入一次，这些文件由本插件加载，不走工作区指令加载器",
			"memory.auto": "自动记忆",
			"memory.auto.detail": "~/.claude/projects/<仓库>/memory/MEMORY.md 的前 200 行或 25KB —— 会话开始时注入一次，只读",
			"memory.nested": "子目录记忆",
			"memory.nested.detail": "读到某个目录下的文件后，注入该目录的 CLAUDE.md、.claude/CLAUDE.md 与 CLAUDE.local.md",
			"memory.imports": "@ 导入",
			"memory.imports.detail": "记忆文件里的 @路径 就地展开，最多 4 跳；代码块与行内代码里的不展开",
			"memoryWrite": "写入记忆",
			"memoryWrite.desc": "开启“加载记忆”后才能启用；允许模型把新记忆写入 Claude Code 的项目自动记忆目录",
			"memoryWrite.requiresMemory": "请先开启“加载记忆”",
			"memoryWrite.files": "话题文件与索引",
			"memoryWrite.files.detail": "调用 claude_memory_write 时创建 memory/<名称>.md，并在 MEMORY.md 追加索引指针；关闭“加载记忆”会同时关闭写入",
			"rules": "加载规则",
			"rules.desc": "折叠 .claude/rules/** 作用域规则",
			"rules.entry": "作用域规则",
			"rules.entry.detail": ".claude/rules/**、~/.claude/rules/** —— 不带 paths 的会话开始时注入，带 paths 的在读到匹配文件后注入",
			"unavailable": "设置当前不可用"
		};
		const en = {
			"nav": "Claude Compat",
			"intro": "Load Claude Code skills, memory files, and scoped rules, with a separate switch for writing auto memory.",
			"switchSection": "Compatibility switches",
			"skills": "Load skills",
			"skills.desc": "Add project and global Claude Code skills to the session skill catalog",
			"skills.entry": "Skill roots",
			"skills.entry.detail": ".claude/skills/**, ~/.claude/skills/** — added to the skill catalog at session start; the model invokes them by name",
			"memory": "Load memory",
			"memory.desc": "Fold the Claude Code CLAUDE.md memory files and auto memory into the session",
			"memory.files": "Memory files",
			"memory.files.detail": "Managed policy CLAUDE.md, ~/.claude/CLAUDE.md, and CLAUDE.md, .claude/CLAUDE.md, and CLAUDE.local.md in every directory from the project root to the working directory — folded once at session start; this plugin loads them, not the workspace instruction loader",
			"memory.auto": "Auto memory",
			"memory.auto.detail": "The first 200 lines or 25 KB of ~/.claude/projects/<repo>/memory/MEMORY.md — folded once at session start; read-only",
			"memory.nested": "Nested memory",
			"memory.nested.detail": "A directory's CLAUDE.md, .claude/CLAUDE.md, and CLAUDE.local.md, folded after a read reaches a file under it",
			"memory.imports": "@ imports",
			"memory.imports.detail": "@path references inside a memory file expand in place, up to 4 hops; code spans and fenced code blocks are left alone",
			"memoryWrite": "Write memory",
			"memoryWrite.desc": "Requires Load memory; lets the model save new memories in Claude Code’s project auto-memory directory",
			"memoryWrite.requiresMemory": "Turn on Load memory first",
			"memoryWrite.files": "Topic files and index",
			"memoryWrite.files.detail": "A claude_memory_write call creates memory/<name>.md and appends an index pointer to MEMORY.md; turning off Load memory also turns off writing",
			"rules": "Load rules",
			"rules.desc": "Fold the .claude/rules/** scoped rules",
			"rules.entry": "Scoped rules",
			"rules.entry.detail": ".claude/rules/**, ~/.claude/rules/** — rules without paths fold at session start; a paths: rule folds after a read matching it",
			"unavailable": "Setting currently unavailable"
		};
		//#endregion
		//#region src/client/settings-controller.ts
		/**
		* Controller bridging the Host `claude-compat` settings namespace onto the
		* Harness-compat section snapshot. Reads the compatibility switches for
		* skills, memory loading and writing, and scoped rules, then flips one through the
		* configuration form.
		*
		* @module @guowenzhang/dsh-claude-compat/client/settings-controller
		*/
		/** Settings namespace registered Host-side by @guowenzhang/dsh-claude-compat: the Loader row id. */
		const CONTEXT_INJECTION_NS = "claude-compat";
		/** Owner handle over the `context-injection` namespace. */
		var ContextInjectionController = class {
			scope;
			store;
			unsubscribe;
			/**
			* @param scope - the `claude-compat` configuration form.
			*/
			constructor(scope) {
				this.scope = scope;
				this.store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(this.projection());
				this.unsubscribe = scope.subscribe(() => this.publish());
			}
			/** Stop observing settings. */
			dispose() {
				this.unsubscribe();
			}
			/** Build the renderer face for this section. */
			inject() {
				return {
					hooks: { contextInjection: this.store },
					toggle: (name) => {
						this.toggle(name);
					}
				};
			}
			toggle(name) {
				const snapshot = this.scope.getSnapshot();
				if (snapshot.status !== "ready" || !snapshot.writable) return;
				const value = snapshot.value?.[name];
				if (value === void 0) return;
				if (name === "memoryWrite" && !snapshot.value?.memory) return;
				if (name === "memory" && value && snapshot.value?.memoryWrite) {
					this.scope.mutate([{
						op: "set",
						path: ["memoryWrite"],
						value: false
					}, {
						op: "set",
						path: ["memory"],
						value: false
					}]);
					return;
				}
				this.scope.set(name, !value);
			}
			projection() {
				const snapshot = this.scope.getSnapshot();
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					skills: snapshot.value?.skills ?? true,
					memory: snapshot.value?.memory ?? true,
					memoryWrite: (snapshot.value?.memory ?? true) && (snapshot.value?.memoryWrite ?? false),
					rules: snapshot.value?.rules ?? true
				};
			}
			publish() {
				this.store.set(this.projection());
			}
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"configForms"
		];
		/**
		* Register the dictionary and the context-injection settings section.
		* @param ctx - client root context.
		*/
		async function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-context-injection: dictionaries");
			const t = ctx.locale.bind(NS);
			const controller = new ContextInjectionController(ctx.configForms.get(CONTEXT_INJECTION_NS));
			ctx.effect(() => () => {
				controller.dispose();
			}, "ui-context-injection: settings form");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "context-injection",
				order: 13,
				label: () => t("nav"),
				locale: NS,
				inject: () => controller.inject()
			}, ContextInjectionSection));
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
