window.__ModuleLoader__.load({
	id: "@zhang-guo-wen/dsh-claude-compat",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		//#region \0dsh-css:C:\02-codespace\deepseek-harness\dsh-claude-compat\src\client\ContextInjectionSection.module.css.mjs
		const css$1 = "._2xcSla_section{flex-direction:column;gap:16px;width:100%;max-width:720px;display:flex}._2xcSla_panel{flex-direction:column;gap:16px;display:flex}._2xcSla_intro{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;white-space:pre-line;border-radius:12px;margin:0;padding:14px 16px;font-size:13px;line-height:22px}._2xcSla_field{flex-direction:column;gap:7px;display:flex}._2xcSla_fieldLabel{font-size:13px;font-weight:600}._2xcSla_fieldHint{color:var(--dsw-alias-label-tertiary);font-size:12px}._2xcSla_promptArea{box-sizing:border-box;resize:vertical;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-1);width:100%;min-height:132px;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);border-radius:12px;outline:none;padding:12px 14px;font-size:12.5px;line-height:19px}._2xcSla_promptArea::placeholder{color:var(--dsw-alias-label-tertiary)}._2xcSla_promptArea:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)}._2xcSla_promptArea:disabled{opacity:.6;cursor:not-allowed}._2xcSla_switchSectionLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);margin:4px 0 0;font-size:11px;font-weight:600}._2xcSla_switchRow{border-bottom:.5px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:16px;padding:12px 0;display:flex}._2xcSla_switchRow:last-child{border-bottom:0}._2xcSla_switchText{flex-direction:column;gap:2px;min-width:0;display:flex}._2xcSla_switchLabel{font-size:13px;font-weight:600}._2xcSla_switchDesc{color:var(--dsw-alias-label-secondary);font-size:12px}._2xcSla_switchFiles{color:var(--dsw-alias-label-tertiary);font-size:11px;font-family:var(--ds-font-family-code);overflow-wrap:anywhere;margin-top:2px}._2xcSla_unavailable{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}";
		const tagId$1 = "@zhang-guo-wen/dsh-claude-compat/ContextInjectionSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var ContextInjectionSection_module_css_default = {
			"field": "_2xcSla_field",
			"fieldHint": "_2xcSla_fieldHint",
			"fieldLabel": "_2xcSla_fieldLabel",
			"intro": "_2xcSla_intro",
			"panel": "_2xcSla_panel",
			"promptArea": "_2xcSla_promptArea",
			"section": "_2xcSla_section",
			"switchDesc": "_2xcSla_switchDesc",
			"switchFiles": "_2xcSla_switchFiles",
			"switchLabel": "_2xcSla_switchLabel",
			"switchRow": "_2xcSla_switchRow",
			"switchSectionLabel": "_2xcSla_switchSectionLabel",
			"switchText": "_2xcSla_switchText",
			"unavailable": "_2xcSla_unavailable"
		};
		//#endregion
		//#region src/client/ContextInjectionSection.tsx
		/**
		* Context-injection settings section: the Harness-compat page for prompt
		* management.
		*
		* It describes the default skill and CLAUDE.md / AGENTS.md loading rules, edits
		* a system-level prompt persisted to the `context-injection` namespace (which
		* the Host injects as a real system-prompt section), and holds the two
		* Claude/Codex rule-injection master toggles.
		*
		* MCP server management is the separate `settings.mcpManager` section owned by
		* the `@zhang-guo-wen/dsh-mcp-manager` plugin, which also owns the loading mode
		* and the per-row tool filters.
		*
		* @module @zhang-guo-wen/dsh-claude-compat/client/ContextInjectionSection
		*/
		/** The settings section body. */
		function ContextInjectionSection(props) {
			const { useContextInjection, t, toggle, updateSystemPrompt } = props;
			const state = useContextInjection((snapshot) => snapshot);
			const [promptDraft, setPromptDraft] = (0, react.useState)(null);
			const disabled = !state.available || !state.writable;
			const promptValue = promptDraft ?? state.systemPrompt;
			const commitPrompt = () => {
				if (promptDraft === null) return;
				updateSystemPrompt(promptDraft);
			};
			const switchRow = (key, descKey, filesKey) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ContextInjectionSection_module_css_default.switchRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: ContextInjectionSection_module_css_default.switchText,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ContextInjectionSection_module_css_default.switchLabel,
							children: t(key)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ContextInjectionSection_module_css_default.switchDesc,
							children: t(descKey)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ContextInjectionSection_module_css_default.switchFiles,
							children: t(filesKey)
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
					checked: key === "claude" ? state.claude : state.codex,
					onChange: () => {
						toggle(key);
					},
					label: t(key),
					disabled,
					title: disabled ? t("unavailable") : void 0
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ContextInjectionSection_module_css_default.section,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ContextInjectionSection_module_css_default.panel,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.intro,
							children: t("prompt.intro")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ContextInjectionSection_module_css_default.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ContextInjectionSection_module_css_default.fieldLabel,
									children: t("systemPrompt.label")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ContextInjectionSection_module_css_default.fieldHint,
									children: t("systemPrompt.hint")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: ContextInjectionSection_module_css_default.promptArea,
									value: promptValue,
									placeholder: t("systemPrompt.placeholder"),
									disabled,
									onChange: (event) => {
										setPromptDraft(event.currentTarget.value);
									},
									onBlur: commitPrompt
								})
							]
						}),
						!state.available ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.unavailable,
							children: t("unavailable")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ContextInjectionSection_module_css_default.switchSectionLabel,
							children: t("switchSection")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [switchRow("claude", "claude.desc", "claude.files"), switchRow("codex", "codex.desc", "codex.files")] })
					]
				})
			});
		}
		//#endregion
		//#region \0dsh-css:C:\02-codespace\deepseek-harness\dsh-claude-compat\src\client\BtwCard.module.css.mjs
		const css = "._3w6nAq_card{z-index:100;border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);max-width:100%;box-shadow:var(--dsw-elevation-stroke);border-radius:12px;flex-direction:column;gap:8px;padding:12px 14px;display:flex;position:absolute;bottom:calc(100% + 4px);left:0}._3w6nAq_header{align-items:center;gap:8px;display:flex}._3w6nAq_title{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;line-height:20px}._3w6nAq_status{color:var(--dsw-alias-label-tertiary);flex:1;font-size:12px;line-height:18px}._3w6nAq_dismiss{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:6px;padding:0 4px;font-size:16px;line-height:20px}._3w6nAq_dismiss:hover{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)}._3w6nAq_dismiss:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}._3w6nAq_answer{max-height:240px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;margin:0;font-size:13px;line-height:20px;overflow-y:auto}._3w6nAq_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:13px;line-height:20px}";
		const tagId = "@zhang-guo-wen/dsh-claude-compat/BtwCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var BtwCard_module_css_default = {
			"answer": "_3w6nAq_answer",
			"card": "_3w6nAq_card",
			"dismiss": "_3w6nAq_dismiss",
			"error": "_3w6nAq_error",
			"header": "_3w6nAq_header",
			"status": "_3w6nAq_status",
			"title": "_3w6nAq_title"
		};
		//#endregion
		//#region src/client/BtwCard.tsx
		/**
		* Render the answer card for one Session.
		* @param props - shared card source, dismissal callback, and `t`.
		* @returns the card while it has something to show; null while closed.
		*/
		function BtwCard({ useBtwCard, dismiss, t, sessionId }) {
			const state = useBtwCard((cards) => cards.cards[String(sessionId)]);
			if (state === void 0 || state.childSessionId === null) return null;
			const status = state.phase === "watching" ? t("status.watching") : state.phase === "answered" ? t("status.answered") : t("status.failed");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: BtwCard_module_css_default.card,
				"aria-label": t("card.aria"),
				"aria-live": "polite",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: BtwCard_module_css_default.header,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: BtwCard_module_css_default.title,
								children: t("card.title")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: BtwCard_module_css_default.status,
								children: status
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: BtwCard_module_css_default.dismiss,
								"aria-label": t("card.dismiss"),
								onClick: () => {
									dismiss(String(sessionId));
								},
								children: "×"
							})
						]
					}),
					state.error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: BtwCard_module_css_default.error,
						role: "alert",
						children: state.error
					}),
					state.answer.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: BtwCard_module_css_default.answer,
						children: state.answer
					})
				]
			});
		}
		/**
		* Recover the forked Session id from a `/btw` receipt.
		* @param result - the Host handler's settled command result.
		* @returns the forked Session id, or null when the receipt is not a success.
		*/
		function childSessionOf(result) {
			if (result.kind !== "success" || result.text === void 0) return null;
			if (!result.text.startsWith("Started /btw as child session ")) return null;
			const rest = result.text.slice(30);
			const end = rest.indexOf(".");
			const id = (end === -1 ? rest : rest.slice(0, end)).trim();
			return id.length === 0 ? null : id;
		}
		//#endregion
		//#region src/client/btw-card-controller.ts
		/**
		* `/btw` answer card state: watches the client command lifecycle for a
		* successful `/btw` dispatch, follows the forked Session it names, and derives
		* the one answer to present.
		*
		* The Host `/btw` handler owns the fork and the prompt. This registry owns only
		* presentation: it reads the forked Session through the Session journal stream
		* (no navigation, no session selection), publishes one plain snapshot per
		* SESSION THAT ASKED, and archives the forked Session once its answer turn
		* closes. The archived Session keeps its own answer; the card only stops
		* showing it.
		*
		* The card is keyed by the Session that dispatched the command, never by the
		* forked Session: the overlay entry renders once per open Session, so one shared
		* snapshot would paint the same card into every window.
		*
		* @module @zhang-guo-wen/dsh-claude-compat/client/btw-card-controller
		*/
		/** The card shown for a Session that has none; also the closed state. */
		const NO_CARD = {
			childSessionId: null,
			phase: "watching",
			answer: "",
			error: null
		};
		/** How long a finished card stays visible after its Session is archived. */
		const ANSWER_LINGER_MS = 6e3;
		/** Delay before retrying an archive the Host refused as not-yet-listed. */
		const ARCHIVE_RETRY_MS = 1500;
		/** Upper bound on the presented answer, in Unicode code points. */
		const MAX_ANSWER_CODE_POINTS = 4e3;
		/** Whether one journal entry carries an assistant text block. */
		function assistantText(entry) {
			if (entry.type !== "event" || entry.event.type !== "assistant/message") return null;
			const texts = [];
			for (const block of entry.event.data.message.content) if (block.type === "text") texts.push(block.text);
			return texts.length === 0 ? null : texts.join("\n\n");
		}
		/**
		* Owns one `/btw` answer card per asking Session.
		*
		* Construct one per client runtime; the plugin body closes over it, resolves the
		* overlay entry's keyed hook source through {@link observable}, and disposes it
		* with the plugin fiber.
		*/
		var BtwCardRegistry = class {
			openStream;
			archiveSession;
			/** The one stable source every overlay entry binds to. */
			store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({ cards: {} });
			cards = /* @__PURE__ */ new Map();
			/** Dismissals published by a failure that never had a stream. */
			timers = /* @__PURE__ */ new Map();
			/**
			* @param openStream - opens the journal stream for one forked Session.
			* @param archiveSession - archives a forked Session once its answer lands.
			*/
			constructor(openStream, archiveSession) {
				this.openStream = openStream;
				this.archiveSession = archiveSession;
			}
			/**
			* The stable source the card entry binds. It always exists, so a hook bound
			* before the first `/btw` dispatch still sees every later card.
			* @returns every card this client currently holds.
			*/
			observable() {
				return this.store;
			}
			/**
			* Handle one client command outcome. Outcomes for other commands are ignored.
			* @param sessionId - the Session that dispatched the command.
			* @param name - the submitted command name.
			* @param result - the Host handler's settled result.
			*/
			observe(sessionId, name, result) {
				if (name !== "btw") return;
				const childSessionId = childSessionOf(result);
				if (childSessionId === null) {
					this.fail(sessionId, result.kind === "error" ? result.text ?? "The side question failed." : "The side question named no session.");
					return;
				}
				this.watch(sessionId, childSessionId);
			}
			/** Close one Session's card without archiving its forked Session. */
			dismiss(sessionId) {
				this.close(sessionId);
			}
			/** Release every stream and timer and close every card. */
			dispose() {
				for (const sessionId of [...this.cardIds()]) this.closeRuntime(sessionId);
				this.store.set({ cards: {} });
			}
			/** Present one failure in the asking Session and schedule its dismissal. */
			fail(sessionId, message) {
				this.closeRuntime(sessionId);
				this.emitCard(sessionId, {
					...NO_CARD,
					phase: "failed",
					error: message
				});
				this.scheduleClose(sessionId);
			}
			/** Start following one forked Session; a later question replaces that card. */
			watch(sessionId, childSessionId) {
				this.closeRuntime(sessionId);
				this.emitCard(sessionId, {
					...NO_CARD,
					childSessionId
				});
				let runtime;
				runtime = {
					stream: this.openStream(childSessionId, (change) => {
						if (runtime === void 0 || runtime.settled || this.cards.get(sessionId) !== runtime) return;
						if (change.type === "replace" || change.type === "prepend") {
							this.absorb(sessionId, change.entries);
							return;
						}
						if (change.type !== "append") return;
						if (change.entry.event.type === "turn/end") {
							runtime.settled = true;
							this.settle(sessionId, childSessionId, runtime);
							return;
						}
						this.absorb(sessionId, [change.entry]);
					}, (error) => {
						if (runtime === void 0 || runtime.settled) return;
						runtime.settled = true;
						this.fail(sessionId, error instanceof Error ? error.message : String(error));
					}),
					settled: false,
					dismissTimer: void 0
				};
				this.cards.set(sessionId, runtime);
			}
			/** Fold one batch of journal entries into the asking Session's answer. */
			absorb(sessionId, entries) {
				const current = this.card(sessionId);
				if (current === void 0) return;
				let answer = current.answer;
				for (const entry of entries) {
					const text = assistantText(entry);
					if (text === null) continue;
					answer = answer.length === 0 ? text : `${answer}\n\n${text}`;
				}
				if (answer === current.answer) return;
				this.emitCard(sessionId, {
					...current,
					answer: [...answer].slice(0, MAX_ANSWER_CODE_POINTS).join("")
				});
			}
			/** Publish the finished answer and archive the Session that owns it. */
			settle(sessionId, childSessionId, runtime) {
				runtime.stream.dispose();
				const current = this.card(sessionId);
				if (current !== void 0) this.emitCard(sessionId, {
					...current,
					phase: "answered"
				});
				this.archive(childSessionId, sessionId, runtime);
				this.scheduleClose(sessionId);
			}
			/**
			* Archive the answered Session, retrying once: a Session the Host has only
			* just forked may not be in the registry-global list yet, and the archive
			* command refuses an id that is neither live nor listed.
			* @param childSessionId - the forked Session to archive.
			* @param sessionId - the asking Session whose card requested this archive.
			* @param runtime - the card that requested it.
			*/
			async archive(childSessionId, sessionId, runtime) {
				try {
					await this.archiveSession(childSessionId);
					return;
				} catch {}
				await new Promise((resolve) => {
					setTimeout(resolve, ARCHIVE_RETRY_MS);
				});
				if (this.cards.get(sessionId) !== runtime) return;
				try {
					await this.archiveSession(childSessionId);
				} catch {}
			}
			/** Schedule one card's own dismissal. */
			scheduleClose(sessionId) {
				const timer = setTimeout(() => {
					this.timers.delete(sessionId);
					this.close(sessionId);
				}, ANSWER_LINGER_MS);
				const runtime = this.cards.get(sessionId);
				if (runtime === void 0) this.timers.set(sessionId, timer);
				else runtime.dismissTimer = timer;
			}
			/**
			* Reset one Session's card to the closed snapshot and release its stream. The
			* closed entry stays in the shared snapshot: the component reads the same
			* state whether the entry is closed or absent, and dropping it would race the
			* card's own dismissal. {@link dispose} clears the map.
			*/
			close(sessionId) {
				this.closeRuntime(sessionId);
				if (this.card(sessionId) === void 0) return;
				this.emitCard(sessionId, { ...NO_CARD });
			}
			/** Release one Session's stream and pending dismissal. */
			closeRuntime(sessionId) {
				const timer = this.cards.get(sessionId)?.dismissTimer ?? this.timers.get(sessionId);
				if (timer !== void 0) clearTimeout(timer);
				this.timers.delete(sessionId);
				const runtime = this.cards.get(sessionId);
				if (runtime === void 0) return;
				runtime.settled = true;
				runtime.stream.dispose();
				this.cards.delete(sessionId);
			}
			/** Every Session id with a card or a pending dismissal. */
			cardIds() {
				return /* @__PURE__ */ new Set([
					...Object.keys(this.store.getSnapshot().cards),
					...this.cards.keys(),
					...this.timers.keys()
				]);
			}
			/** One Session's published card, or undefined when it has none. */
			card(sessionId) {
				return this.store.getSnapshot().cards[sessionId];
			}
			/** Publish one Session's card, or drop it. */
			emitCard(sessionId, snapshot) {
				this.publish(sessionId, snapshot);
			}
			/** Replace the shared snapshot, removing one Session's entry when absent. */
			publish(sessionId, snapshot) {
				const cards = { ...this.store.getSnapshot().cards };
				if (snapshot === void 0) delete cards[sessionId];
				else cards[sessionId] = snapshot;
				this.store.set({ cards });
			}
		};
		/**
		* Follow one Session's event journal for the card.
		*
		* This deliberately does not use `SessionEventStream`: that class requests the
		* process-local assistant stream and refuses an opening snapshot without the
		* matching baseline, which is unavailable on deployments that do not publish
		* one — the stream then never opens and the card has nothing to show. The card
		* only needs durable events, so it reads the raw journal without that opt-in.
		*
		* @param remote - the client `ctx.remote.session` namespace value.
		* @param sessionId - the forked Session to follow.
		* @param onChange - publication sink for durable entries.
		* @param onFailure - terminal failure sink (open or carrier failure).
		* @returns the stream handle.
		*/
		function followSession(remote, sessionId, onChange, onFailure) {
			const abort = new AbortController();
			const sessionRemote = remote;
			(async () => {
				try {
					for await (const frame of sessionRemote.session.follow({ address: {
						kind: "session",
						sessionId
					} }, abort.signal)) {
						if (frame.type !== "event" || frame.event === void 0) continue;
						onChange({
							type: "append",
							entry: {
								type: "event",
								event: frame.event
							}
						});
					}
				} catch (error) {
					if (abort.signal.aborted) return;
					onFailure(error);
					return;
				}
				if (!abort.signal.aborted) onFailure(/* @__PURE__ */ new Error("session follow ended"));
			})();
			return { dispose: () => {
				abort.abort();
			} };
		}
		/**
		* Follow one Session's journal for the card, bound to the client Session remote.
		* @param remote - the client `ctx.remote.session` namespace value.
		* @param sessionId - the forked Session to follow.
		* @param onChange - publication sink for durable entries.
		* @param onFailure - terminal failure sink (open or carrier failure).
		* @returns the stream handle.
		*/
		function sessionStreamFactory(remote, sessionId, onChange, onFailure) {
			return followSession(remote, String(sessionId), onChange, onFailure);
		}
		//#endregion
		//#region src/client/locales-btw.ts
		/** `/btw` answer card copy (zh is the source of truth; en mirrors it). */
		/** Dictionary namespace owned by this plugin's card. */
		const NS$1 = "claudeCompatBtw";
		const zh$1 = {
			"card.title": "/btw 侧边问答",
			"card.aria": "/btw 侧边问答卡片",
			"card.dismiss": "关闭卡片",
			"status.watching": "正在回答…",
			"status.answered": "已回答",
			"status.failed": "失败"
		};
		const en$1 = {
			"card.title": "/btw side question",
			"card.aria": "/btw side question card",
			"card.dismiss": "Dismiss card",
			"status.watching": "Answering…",
			"status.answered": "Answered",
			"status.failed": "Failed"
		};
		//#endregion
		//#region src/client/locales.ts
		/**
		* Context-injection settings section dictionaries.
		* @module @zhang-guo-wen/dsh-claude-compat/client/locales
		*/
		/** Locale namespace owned by this plugin. */
		const NS = "settings.contextInjection";
		const zh = {
			"nav": "Claude 兼容",
			"prompt.intro": "默认加载 AGENTS.md、CLAUDE.md：会话开始时加载一次（项目根 + 全局），后续对文件的修改不会重复注入。",
			"systemPrompt.label": "系统提示词",
			"systemPrompt.hint": "这里的内容会作为 system 级别的提示词注入会话，默认留空；可嵌入固定规则与身份信息。",
			"systemPrompt.placeholder": "例如：你是资深工程师，优先用中文作答，遇到不确定的配置先查文档，不要臆断。",
			"switchSection": "加载开关",
			"claude": "加载 Claude 规则",
			"claude.desc": "把项目与全局的 Claude Code 规则与技能注入会话",
			"claude.files": "注入：.claude/CLAUDE.md、~/.claude/CLAUDE.md、.claude/skills/**、~/.claude/skills/**、.claude/rules/**、~/.claude/rules/**",
			"codex": "加载 Codex 规则",
			"codex.desc": "把项目与全局的 Codex 规则注入会话",
			"codex.files": "注入：.codex/AGENTS.md、~/.codex/AGENTS.md",
			"unavailable": "设置当前不可用"
		};
		const en = {
			"nav": "Claude Compat",
			"prompt.intro": "AGENTS.md and CLAUDE.md load by default, once at session start (project root + global); later edits are not re-injected.",
			"systemPrompt.label": "System prompt",
			"systemPrompt.hint": "Content here is injected into the session at the system level; it defaults to empty. Embed fixed rules and identity.",
			"systemPrompt.placeholder": "e.g. You are a senior engineer; answer in Chinese; check docs before guessing.",
			"switchSection": "Loading switches",
			"claude": "Load Claude rules",
			"claude.desc": "Inject project and global Claude Code rules and skills into the session",
			"claude.files": "Loads: .claude/CLAUDE.md, ~/.claude/CLAUDE.md, .claude/skills/**, ~/.claude/skills/**, .claude/rules/**, ~/.claude/rules/**",
			"codex": "Load Codex rules",
			"codex.desc": "Inject project and global Codex rules into the session",
			"codex.files": "Loads: .codex/AGENTS.md, ~/.codex/AGENTS.md",
			"unavailable": "Setting currently unavailable"
		};
		//#endregion
		//#region src/client/settings-controller.ts
		/**
		* Controller bridging the Host `context-injection` settings namespace onto the
		* Harness-compat section snapshot. Reads the two rule-injection toggles and the
		* user system prompt, and writes one field at a time through the settings
		* scope.
		*
		* MCP server management is a separate plugin
		* (`@zhang-guo-wen/dsh-mcp-manager`) with its own section and namespace; this
		* controller carries no MCP state.
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
					},
					updateSystemPrompt: (value) => {
						this.updateSystemPrompt(value);
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
			updateSystemPrompt(value) {
				const snapshot = this.scope.getSnapshot();
				if (snapshot.status !== "ready" || !snapshot.writable) return;
				this.scope.set("systemPrompt", value);
			}
			projection() {
				const snapshot = this.scope.getSnapshot();
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					claude: snapshot.value?.claude ?? true,
					codex: snapshot.value?.codex ?? true,
					systemPrompt: snapshot.value?.systemPrompt ?? ""
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
			"settingsScope",
			"remote",
			"remote.session",
			"workspaces"
		];
		/**
		* Register the dictionaries, the context-injection settings section, and the
		* `/btw` answer card.
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
			ctx.effect(() => ctx.locale.register(NS$1, {
				zh: zh$1,
				en: en$1
			}), "claude-compat: btw dictionaries");
			const cards = new BtwCardRegistry((sessionId, onChange, onFailure) => sessionStreamFactory(ctx.remote.session, sessionId, onChange, onFailure), (sessionId) => ctx.workspaces.archiveSession(sessionId));
			ctx.effect(() => () => {
				cards.dispose();
			}, "claude-compat: btw cards");
			ctx.effect(() => ctx.on("command/executed", (sessionId, name, result) => {
				cards.observe(String(sessionId), name, result);
			}), "claude-compat: btw cards follow command/executed");
			ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
				name: "conversation.input.overlay",
				id: "btw-card",
				order: 20,
				locale: NS$1,
				inject: () => ({
					hooks: { btwCard: cards.observable() },
					dismiss: (sessionId) => {
						cards.dismiss(sessionId);
					}
				})
			}, BtwCard));
		}
		//#endregion
		exports.NS = NS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
