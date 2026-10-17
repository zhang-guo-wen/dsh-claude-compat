window.__ModuleLoader__.load({
	id: "@guowenzhang/dsh-claude-compat",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region \0dsh-css:C:\Users\Windows11\AppData\Local\Temp\dsh-I0sgSn\dsh-release-20261017\work\dsh-claude-compat\src\client\ContextInjectionSection.module.css.mjs
		const css = ".dVyNsG_section{box-sizing:border-box;flex-direction:column;gap:16px;width:100%;max-width:760px;display:flex;container:dVyNsG_context-injection/inline-size}.dVyNsG_panel{flex-direction:column;gap:16px;display:flex}.dVyNsG_switchRow{flex-direction:column;gap:10px;padding:12px 0;display:flex}.dVyNsG_switchHead{justify-content:space-between;align-items:flex-start;gap:16px;display:flex}.dVyNsG_switchText{flex-direction:column;gap:2px;min-width:0;display:flex}.dVyNsG_switchLabel{font:var(--dsw-font-xs-13);font-weight:600}.dVyNsG_switchDesc{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}.dVyNsG_saveNote{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);margin:0}.dVyNsG_saveFailure{flex-wrap:wrap;align-items:center;gap:8px;display:flex}.dVyNsG_saveFailure p{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:0}.dVyNsG_compatList{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}.dVyNsG_compatItem{border-left:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:1px;padding-left:10px;display:flex}.dVyNsG_compatHead{flex-wrap:wrap;align-items:center;gap:4px 8px;min-width:0;display:flex}.dVyNsG_compatTitle{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-secondary);font-weight:600}.dVyNsG_compatPaths{flex-wrap:wrap;gap:4px;min-width:0;display:flex}.dVyNsG_compatPaths>span{white-space:normal;overflow-wrap:anywhere;max-width:100%}.dVyNsG_compatDetail{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere}.dVyNsG_unavailable{font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-tertiary);margin:0}.dVyNsG_unavailableHint{font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);margin:0}.dVyNsG_footnote{border-top:.5px solid var(--dsw-alias-border-l2);font:var(--dsw-font-xxs-12);color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;margin:0;padding-top:12px}@container dVyNsG_context-injection (width<=520px){.dVyNsG_switchHead{flex-direction:column;align-items:stretch}}@media (pointer:coarse){.dVyNsG_switchHead{min-height:44px}}";
		const tagId = "@guowenzhang/dsh-claude-compat/ContextInjectionSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ContextInjectionSection_module_css_default = {
			"compatDetail": "dVyNsG_compatDetail",
			"compatHead": "dVyNsG_compatHead",
			"compatItem": "dVyNsG_compatItem",
			"compatList": "dVyNsG_compatList",
			"compatPaths": "dVyNsG_compatPaths",
			"compatTitle": "dVyNsG_compatTitle",
			"context-injection": "dVyNsG_context-injection",
			"footnote": "dVyNsG_footnote",
			"panel": "dVyNsG_panel",
			"saveFailure": "dVyNsG_saveFailure",
			"saveNote": "dVyNsG_saveNote",
			"section": "dVyNsG_section",
			"switchDesc": "dVyNsG_switchDesc",
			"switchHead": "dVyNsG_switchHead",
			"switchLabel": "dVyNsG_switchLabel",
			"switchRow": "dVyNsG_switchRow",
			"switchText": "dVyNsG_switchText",
			"unavailable": "dVyNsG_unavailable",
			"unavailableHint": "dVyNsG_unavailableHint"
		};
		//#endregion
		//#region src/client/ContextInjectionSection.tsx
		/**
		* Context-injection settings section: the Harness-compat page.
		*
		* It holds one switch per part of the compatibility surface — skills, memory
		* files, auto memory, memory writing, and scoped rules. Each switch carries its
		* label and exactly one line, and that line states the state the switch is in:
		* what it loads while it is on, and what its off state does while it is off.
		* Under it, every entry carries its label, the paths it reads as tags, and one
		* short hint. Nothing on the page is hover-only — a touch device has no hover —
		* and one footer line states what a mid-session flip can and cannot do. The copy
		* stays terse on purpose: it is there to name the switch, its paths, and the
		* traps, not to explain the feature. A flip in flight and a flip that failed
		* stay beside their own switch: the failure carries the retry that presses that
		* same switch again. A landed flip is reported in the host's floating banner
		* instead, which is where a long page cannot scroll it away, and it names the
		* switch it belongs to because the banner is no longer next to any row.
		*
		* @module @guowenzhang/dsh-claude-compat/client/ContextInjectionSection
		*/
		/** The switches, in the order the page presents them. */
		const COMPAT_SWITCHES = [
			{
				name: "skills",
				label: "skills",
				on: "skills.on",
				entries: [{
					title: "skills.entry",
					paths: [".claude/skills/**", "~/.claude/skills/**"],
					hint: "skills.entry.hint"
				}]
			},
			{
				name: "memory",
				label: "prompts",
				on: "prompts.on",
				off: "prompts.off",
				entries: [
					{
						title: "prompts.files",
						paths: [
							"CLAUDE.md",
							".claude/CLAUDE.md",
							"CLAUDE.local.md",
							"~/.claude/CLAUDE.md"
						],
						hint: "prompts.files.hint"
					},
					{
						title: "prompts.nested",
						paths: [
							"**/CLAUDE.md",
							"**/.claude/CLAUDE.md",
							"**/CLAUDE.local.md"
						],
						hint: "prompts.nested.hint"
					},
					{
						title: "prompts.imports",
						paths: ["@<path>"],
						hint: "prompts.imports.hint"
					}
				]
			},
			{
				name: "autoMemory",
				label: "autoMemory",
				on: "autoMemory.on",
				entries: [{
					title: "autoMemory.entry",
					paths: ["~/.claude/projects/<repo>/memory/MEMORY.md"],
					hint: "autoMemory.entry.hint"
				}]
			},
			{
				name: "memoryWrite",
				label: "memoryWrite",
				on: "memoryWrite.on",
				entries: [{
					title: "memoryWrite.entry",
					paths: ["memory/<name>.md", "MEMORY.md"],
					hint: "memoryWrite.entry.hint"
				}]
			},
			{
				name: "rules",
				label: "rules",
				on: "rules.on",
				entries: [{
					title: "rules.entry",
					paths: [".claude/rules/**", "~/.claude/rules/**"],
					hint: "rules.entry.hint"
				}]
			}
		];
		/** The settings section body. */
		function ContextInjectionSection(props) {
			const { useContextInjection, t, toggle } = props;
			const state = useContextInjection((snapshot) => snapshot);
			const disabled = !state.available || !state.writable;
			/**
			* The landed flip as the host's floating banner reports it. The controller
			* clears each switch's `saved` phase on its own timer, so this tracks the one
			* that arrived last and names it: the banner is not beside any row. The banner
			* owns its own lifetime and reports completion, exactly as the archive report
			* does; nothing here measures it a second time.
			*/
			const [landed, setLanded] = (0, react.useState)(null);
			const landedSeq = (0, react.useRef)(0);
			(0, react.useEffect)(() => {
				const saved = COMPAT_SWITCHES.find((entry) => state.saves[entry.name].phase === "saved");
				if (saved === void 0) return;
				landedSeq.current += 1;
				setLanded({
					text: `${t("saved")} · ${t(saved.label)}`,
					seq: landedSeq.current
				});
			}, [state.saves, t]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ContextInjectionSection_module_css_default.section,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ContextInjectionSection_module_css_default.panel,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: COMPAT_SWITCHES.map((entry) => {
							const save = state.saves[entry.name];
							const line = state[entry.name] || entry.off === void 0 ? entry.on : entry.off;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ContextInjectionSection_module_css_default.switchRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: ContextInjectionSection_module_css_default.switchHead,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: ContextInjectionSection_module_css_default.switchText,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ContextInjectionSection_module_css_default.switchLabel,
												children: t(entry.label)
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ContextInjectionSection_module_css_default.switchDesc,
												children: t(line)
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
											checked: state[entry.name],
											onChange: () => {
												toggle(entry.name);
											},
											label: t(entry.label),
											disabled: disabled || save.phase === "saving",
											title: disabled ? t("unavailable") : void 0
										})]
									}),
									save.phase === "saving" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: ContextInjectionSection_module_css_default.saveNote,
										role: "status",
										children: t("saving")
									}) : null,
									save.phase === "failed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: ContextInjectionSection_module_css_default.saveFailure,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
											role: "alert",
											children: `${t("saveFailed")} ${save.message}`
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											variant: "outline",
											size: "sm",
											disabled,
											onClick: () => {
												toggle(entry.name);
											},
											children: t("retry")
										})]
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
										className: ContextInjectionSection_module_css_default.compatList,
										children: entry.entries.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
											className: ContextInjectionSection_module_css_default.compatItem,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												className: ContextInjectionSection_module_css_default.compatHead,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: ContextInjectionSection_module_css_default.compatTitle,
													children: t(item.title)
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: ContextInjectionSection_module_css_default.compatPaths,
													children: item.paths.map((path) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tag, {
														tone: "neutral",
														children: path
													}, path))
												})]
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ContextInjectionSection_module_css_default.compatDetail,
												children: t(item.hint)
											})]
										}, item.title))
									})
								]
							}, entry.name);
						}) }),
						!state.available ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.unavailable,
							children: t("unavailable")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.unavailableHint,
							children: t("unavailableHint")
						})] }) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.footnote,
							children: t("footer")
						})
					]
				}), landed !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
					text: landed.text,
					tone: "success",
					onDone: () => {
						setLanded((current) => current?.seq === landed.seq ? null : current);
					}
				}, landed.seq) : null]
			});
		}
		//#endregion
		//#region src/client/locales.ts
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
		const NS = "settings.contextInjection";
		const zh = {
			"nav": "Claude 兼容",
			"skills": "加载技能",
			"skills.on": "把项目与全局的 Claude Code 技能加进会话技能目录",
			"skills.entry": "技能目录",
			"skills.entry.hint": "会话开始时进入，模型按名调用",
			"prompts": "加载记忆",
			"prompts.on": "把 Claude Code 的 CLAUDE.md 记忆文件注入会话（≤4 MiB/文件、≤4 跳、≤256 KiB/批）",
			"prompts.off": "关闭后 CLAUDE.md 交回工作区指令加载器（1 MiB、不展开 @）",
			"prompts.files": "记忆文件",
			"prompts.files.hint": "会话开始时注入一次",
			"prompts.nested": "子目录记忆",
			"prompts.nested.hint": "读到该目录下的文件后注入",
			"prompts.imports": "@ 导入",
			"prompts.imports.hint": "工作目录外的路径也直接展开，不询问",
			"autoMemory": "加载自动记忆",
			"autoMemory.on": "把 Claude Code 的自动记忆索引注入会话（取前 200 行或 25 KB）",
			"autoMemory.entry": "自动记忆",
			"autoMemory.entry.hint": "会话开始时注入，只读",
			"memoryWrite": "写入记忆",
			"memoryWrite.on": "允许模型把新记忆写入项目自动记忆目录（同名不覆盖；索引满 200 行或 25 KB 后拒绝新增）",
			"memoryWrite.entry": "话题文件与索引",
			"memoryWrite.entry.hint": "创建话题文件并追加索引指针",
			"rules": "加载规则",
			"rules.on": "折叠 .claude/rules/** 作用域规则（单文件 1 MiB、整批 256 KiB）",
			"rules.entry": "作用域规则",
			"rules.entry.hint": "不带 paths 下个请求折入，带 paths 读到匹配文件后折入",
			"footer": "改动在下一个请求生效；已注入的内容不会撤回，本会话已折过的那批也不会补入 —— 建议新建会话",
			"saving": "保存中…",
			"saved": "已保存",
			"saveFailed": "开关未生效：",
			"retry": "重试",
			"unavailable": "设置当前不可用",
			"unavailableHint": "这个部署没有挂载 claude-compat 设置命名空间。确认插件行已在 profile 里启用（这五个开关由插件行的 Config 提供）。"
		};
		const en = {
			"nav": "Claude Compat",
			"skills": "Load skills",
			"skills.on": "Add project and global skills to the session",
			"skills.entry": "Skill roots",
			"skills.entry.hint": "Catalogued at start, invoked by name",
			"prompts": "Load memory",
			"prompts.on": "Fold CLAUDE.md memory files into the session (≤4 MiB/file, ≤4 hops, ≤256 KiB/batch)",
			"prompts.off": "Off hands CLAUDE.md back to the workspace loader (1 MiB, no @ expansion)",
			"prompts.files": "Memory files",
			"prompts.files.hint": "Folded once at session start",
			"prompts.nested": "Nested memory",
			"prompts.nested.hint": "Folded after a read under the directory",
			"prompts.imports": "@ imports",
			"prompts.imports.hint": "Outside paths expand too, without asking",
			"autoMemory": "Load auto memory",
			"autoMemory.on": "Fold the auto-memory index into the session (first 200 lines or 25 KB)",
			"autoMemory.entry": "Auto memory",
			"autoMemory.entry.hint": "Folded once at session start, read-only",
			"memoryWrite": "Write memory",
			"memoryWrite.on": "Let the model write new memories (never overwrites; index stops at 200 lines or 25 KB)",
			"memoryWrite.entry": "Topic files and index",
			"memoryWrite.entry.hint": "Creates a topic file and indexes it",
			"rules": "Load rules",
			"rules.on": "Fold the .claude/rules/** scoped rules (1 MiB per file, 256 KiB per batch)",
			"rules.entry": "Scoped rules",
			"rules.entry.hint": "Folds next request, or after a matching read",
			"footer": "Changes apply on the next request; folded content is not withdrawn or folded again — start a new session",
			"saving": "Saving…",
			"saved": "Saved",
			"saveFailed": "The switch did not take effect:",
			"retry": "Retry",
			"unavailable": "Setting currently unavailable",
			"unavailableHint": "This deployment does not mount the claude-compat settings namespace. Check that the plugin row is enabled in the profile: these five switches come from that row’s Config."
		};
		//#endregion
		//#region src/client/settings-controller.ts
		/**
		* Controller bridging the Host `claude-compat` settings namespace onto the
		* Harness-compat section snapshot. Reads the compatibility switches for
		* skills, prompt files, auto memory, memory writing, and scoped rules, then
		* flips one through the configuration form.
		*
		* A flip is asynchronous, so each switch publishes its own write state: the
		* section shows 保存中 / 已保存 / 失败 beside the switch that was flipped, and
		* the Host's committed value stays the source of the switch position (a failed
		* write therefore leaves the switch where it was). Every switch writes only
		* itself: the Host keeps no switch dependent on another.
		*
		* @module @guowenzhang/dsh-claude-compat/client/settings-controller
		*/
		/** Settings namespace registered Host-side by @guowenzhang/dsh-claude-compat: the Loader row id. */
		const CONTEXT_INJECTION_NS = "claude-compat";
		/** The resting write state, shared because it carries no per-switch data. */
		const IDLE = { phase: "idle" };
		/** How long a successful write keeps its note before the row goes quiet. */
		const SAVED_NOTE_MS = 2e3;
		/** Owner handle over the `claude-compat` namespace. */
		var ContextInjectionController = class {
			scope;
			store;
			unsubscribe;
			saves = /* @__PURE__ */ new Map();
			saveTimers = /* @__PURE__ */ new Map();
			/**
			* @param scope - the `claude-compat` configuration form.
			*/
			constructor(scope) {
				this.scope = scope;
				this.store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(this.projection());
				this.unsubscribe = scope.subscribe(() => this.publish());
			}
			/** Stop observing settings and drop any pending note timers. */
			dispose() {
				this.unsubscribe();
				for (const timer of this.saveTimers.values()) clearTimeout(timer);
				this.saveTimers.clear();
			}
			/** Build the renderer face for this section. */
			inject() {
				return {
					hooks: { contextInjection: this.store },
					toggle: (name) => this.toggle(name)
				};
			}
			async toggle(name) {
				const snapshot = this.scope.getSnapshot();
				if (snapshot.status !== "ready" || !snapshot.writable) return;
				const value = snapshot.value?.[name];
				if (value === void 0) return;
				this.setSave(name, { phase: "saving" });
				try {
					await this.scope.set(name, !value);
				} catch (error) {
					this.setSave(name, {
						phase: "failed",
						message: error instanceof Error ? error.message : String(error)
					});
					return;
				}
				this.setSave(name, { phase: "saved" });
				this.scheduleNoteClear(name);
			}
			/** Publish one switch's write state, which is what the section renders. */
			setSave(name, save) {
				this.saves.set(name, save);
				this.publish();
			}
			/** Drop a success note after a moment, so it does not become a permanent label. */
			scheduleNoteClear(name) {
				const previous = this.saveTimers.get(name);
				if (previous !== void 0) clearTimeout(previous);
				this.saveTimers.set(name, setTimeout(() => {
					this.saveTimers.delete(name);
					if (this.saves.get(name)?.phase === "saved") this.setSave(name, IDLE);
				}, SAVED_NOTE_MS));
			}
			projection() {
				const snapshot = this.scope.getSnapshot();
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					skills: snapshot.value?.skills ?? true,
					memory: snapshot.value?.memory ?? true,
					autoMemory: snapshot.value?.autoMemory ?? true,
					memoryWrite: snapshot.value?.memoryWrite ?? false,
					rules: snapshot.value?.rules ?? true,
					saves: {
						skills: this.saves.get("skills") ?? IDLE,
						memory: this.saves.get("memory") ?? IDLE,
						autoMemory: this.saves.get("autoMemory") ?? IDLE,
						memoryWrite: this.saves.get("memoryWrite") ?? IDLE,
						rules: this.saves.get("rules") ?? IDLE
					}
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
