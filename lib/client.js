window.__ModuleLoader__.load({
	id: "@zhang-guo-wen/dsh-claude-compat",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region \0dsh-css:C:\02-codespace\deepseek-harness\dsh-claude-compat\src\client\ContextInjectionSection.module.css.mjs
		const css = "._2xcSla_section{flex-direction:column;gap:16px;width:100%;max-width:720px;display:flex}._2xcSla_panel{flex-direction:column;gap:16px;display:flex}._2xcSla_intro{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;white-space:pre-line;border-radius:12px;margin:0;padding:14px 16px;font-size:13px;line-height:22px}._2xcSla_switchSectionLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);margin:4px 0 0;font-size:11px;font-weight:600}._2xcSla_switchRow{flex-direction:column;gap:10px;padding:12px 0;display:flex}._2xcSla_switchHead{justify-content:space-between;align-items:flex-start;gap:16px;display:flex}._2xcSla_switchText{flex-direction:column;gap:2px;min-width:0;display:flex}._2xcSla_switchLabel{font-size:13px;font-weight:600}._2xcSla_switchDesc{color:var(--dsw-alias-label-secondary);font-size:12px}._2xcSla_compatList{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}._2xcSla_compatItem{border-left:2px solid var(--dsw-alias-border-l2);flex-direction:column;gap:1px;padding-left:10px;display:flex}._2xcSla_compatTitle{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:600}._2xcSla_compatDetail{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;font-size:11.5px;line-height:17px}._2xcSla_unavailable{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}";
		const tagId = "@zhang-guo-wen/dsh-claude-compat/ContextInjectionSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ContextInjectionSection_module_css_default = {
			"compatDetail": "_2xcSla_compatDetail",
			"compatItem": "_2xcSla_compatItem",
			"compatList": "_2xcSla_compatList",
			"compatTitle": "_2xcSla_compatTitle",
			"intro": "_2xcSla_intro",
			"panel": "_2xcSla_panel",
			"section": "_2xcSla_section",
			"switchDesc": "_2xcSla_switchDesc",
			"switchHead": "_2xcSla_switchHead",
			"switchLabel": "_2xcSla_switchLabel",
			"switchRow": "_2xcSla_switchRow",
			"switchSectionLabel": "_2xcSla_switchSectionLabel",
			"switchText": "_2xcSla_switchText",
			"unavailable": "_2xcSla_unavailable"
		};
		//#endregion
		//#region src/client/ContextInjectionSection.tsx
		/** The three switches, in the order the page presents them. */
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
									checked: state[entry.name],
									onChange: () => {
										toggle(entry.name);
									},
									label: t(entry.label),
									disabled,
									title: disabled ? t("unavailable") : void 0
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
		* @module @zhang-guo-wen/dsh-claude-compat/client/locales
		*/
		/** Locale namespace owned by this plugin. */
		const NS = "settings.contextInjection";
		const zh = {
			"nav": "Claude 兼容",
			"intro": "把 Claude Code 的技能、记忆文件与作用域规则注入会话。三项各自独立开关，默认全开。",
			"switchSection": "加载开关",
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
			"rules": "加载规则",
			"rules.desc": "折叠 .claude/rules/** 作用域规则",
			"rules.entry": "作用域规则",
			"rules.entry.detail": ".claude/rules/**、~/.claude/rules/** —— 不带 paths 的会话开始时注入，带 paths 的在读到匹配文件后注入",
			"unavailable": "设置当前不可用"
		};
		const en = {
			"nav": "Claude Compat",
			"intro": "Fold Claude Code skills, memory files, and scoped rules into the session. Each of the three has its own switch, and all are on by default.",
			"switchSection": "Loading switches",
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
			"rules": "Load rules",
			"rules.desc": "Fold the .claude/rules/** scoped rules",
			"rules.entry": "Scoped rules",
			"rules.entry.detail": ".claude/rules/**, ~/.claude/rules/** — rules without paths fold at session start; a paths: rule folds after a read matching it",
			"unavailable": "Setting currently unavailable"
		};
		//#endregion
		//#region src/client/settings-controller.ts
		/**
		* Controller bridging the Host `context-injection` settings namespace onto the
		* Harness-compat section snapshot. Reads the three compatibility switches —
		* skills, memory, and scoped rules — and flips one at a time through the
		* settings scope.
		*
		* @module @zhang-guo-wen/dsh-claude-compat/client/settings-controller
		*/
		/** Settings namespace registered Host-side by @zhang-guo-wen/dsh-claude-compat. */
		const CONTEXT_INJECTION_NS = "context-injection";
		/** Owner handle over the `context-injection` namespace. */
		var ContextInjectionController = class {
			scope;
			store;
			unsubscribe;
			/**
			* @param scope - bound `context-injection` settings scope.
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
				this.scope.set(name, !value);
			}
			projection() {
				const snapshot = this.scope.getSnapshot();
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					skills: snapshot.value?.skills ?? true,
					memory: snapshot.value?.memory ?? true,
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
			"settingsScope"
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
			const controller = new ContextInjectionController(ctx.settingsScope.bind({ namespace: CONTEXT_INJECTION_NS }));
			ctx.effect(() => () => {
				controller.dispose();
			}, "ui-context-injection: scope");
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
