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
		//#region \0dsh-css:C:\02-codespace\dsh-claude-compat\packages\claude-compat\src\client\ContextInjectionSection.module.css.mjs
		const css = "._7SvOdG_section{flex-direction:column;gap:16px;width:100%;max-width:720px;display:flex}._7SvOdG_tabs{background:var(--dsw-alias-bg-module-platform);border-radius:12px;align-self:flex-start;align-items:center;gap:2px;padding:3px;display:inline-flex}._7SvOdG_tab{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:9px;padding:7px 16px;font-size:13px;line-height:20px}._7SvOdG_tab:hover{color:var(--dsw-alias-label-secondary)}._7SvOdG_tab:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}._7SvOdG_tab[aria-selected=true]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-elevation-stroke);font-weight:600}._7SvOdG_panel{flex-direction:column;gap:16px;display:flex}._7SvOdG_intro{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;white-space:pre-line;border-radius:12px;margin:0;padding:14px 16px;font-size:13px;line-height:22px}._7SvOdG_field{flex-direction:column;gap:7px;display:flex}._7SvOdG_fieldLabel{font-size:13px;font-weight:600}._7SvOdG_fieldHint{color:var(--dsw-alias-label-tertiary);font-size:12px}._7SvOdG_promptArea{box-sizing:border-box;resize:vertical;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-1);width:100%;min-height:132px;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);border-radius:12px;outline:none;padding:12px 14px;font-size:12.5px;line-height:19px}._7SvOdG_promptArea::placeholder{color:var(--dsw-alias-label-tertiary)}._7SvOdG_promptArea:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)}._7SvOdG_promptArea:disabled{opacity:.6;cursor:not-allowed}._7SvOdG_switchSectionLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);margin:4px 0 0;font-size:11px;font-weight:600}._7SvOdG_switchRow{border-bottom:.5px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:16px;padding:12px 0;display:flex}._7SvOdG_switchRow:last-child{border-bottom:0}._7SvOdG_switchText{flex-direction:column;gap:2px;min-width:0;display:flex}._7SvOdG_switchLabel{font-size:13px;font-weight:600}._7SvOdG_switchDesc{color:var(--dsw-alias-label-secondary);font-size:12px}._7SvOdG_switchFiles{color:var(--dsw-alias-label-tertiary);font-size:11px;font-family:var(--ds-font-family-code);overflow-wrap:anywhere;margin-top:2px}._7SvOdG_mcpSub{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12.5px;line-height:20px}._7SvOdG_mcpToolbar{justify-content:space-between;align-items:center;gap:12px;display:flex}._7SvOdG_modeBlock{flex-direction:column;gap:7px;display:flex}._7SvOdG_modeGroup{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;display:grid}._7SvOdG_modeOption{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;border-radius:12px;flex-direction:column;align-items:flex-start;gap:4px;padding:10px 12px;display:flex}._7SvOdG_modeOption:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}._7SvOdG_modeOption:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}._7SvOdG_modeOption:disabled{opacity:.55;cursor:not-allowed}._7SvOdG_modeOptionActive{border-color:var(--dsw-alias-state-business-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary)}._7SvOdG_modeName{font-size:13px;font-weight:600}._7SvOdG_modeDesc{color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:17px}._7SvOdG_mcpList{flex-direction:column;gap:10px;display:flex}._7SvOdG_mcpRow{background:var(--dsw-alias-bg-layer-1);box-shadow:var(--dsw-elevation-stroke);border-radius:12px;justify-content:space-between;align-items:center;gap:14px;padding:12px 14px;display:flex}._7SvOdG_mcpMain{flex-direction:column;gap:3px;min-width:0;display:flex}._7SvOdG_mcpName{font-size:14px;font-weight:600;font-family:var(--ds-font-family-code)}._7SvOdG_mcpDesc{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;background:0 0;border:0;outline:none;padding:0;font-family:inherit;font-size:12px;line-height:18px}._7SvOdG_mcpDesc::placeholder{color:var(--dsw-alias-label-tertiary);opacity:.7}._7SvOdG_mcpDesc:focus{color:var(--dsw-alias-label-primary);border-bottom:1px solid var(--dsw-alias-state-business-primary)}._7SvOdG_mcpRight{flex:none;align-items:center;gap:10px;display:inline-flex}._7SvOdG_badge{corner-shape:round;border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:999px;padding:2px 8px;font-size:11px}._7SvOdG_status{color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;font-size:12px;display:inline-flex}._7SvOdG_mcpActions{align-items:center;gap:8px;display:inline-flex}._7SvOdG_mcpAction{appearance:none;border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;background:0 0;border-radius:6px;padding:4px 10px;font-size:12px}._7SvOdG_mcpAction:hover{background:var(--dsw-alias-bg-layer-2)}._7SvOdG_mcpAction:disabled{opacity:.5;cursor:not-allowed}._7SvOdG_mcpStatus{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}._7SvOdG_mcpFailure{color:var(--dsw-alias-state-error-primary);align-items:center;gap:10px;display:flex}._7SvOdG_mcpFailure p{margin:0;font-size:13px}._7SvOdG_mcpRetry{border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:4px 10px;font-size:12px}._7SvOdG_mcpRetry:hover{background:var(--dsw-alias-interactive-bg-hover)}._7SvOdG_empty,._7SvOdG_unavailable{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}._7SvOdG_mcpForm{flex-direction:column;gap:12px;display:flex}._7SvOdG_formField{flex-direction:column;gap:6px;display:flex}._7SvOdG_formLabel{color:var(--dsw-alias-label-secondary);font-size:12px}._7SvOdG_formSelect{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;color:var(--dsw-alias-label-primary);border-radius:8px;padding:8px 10px;font-size:13px}._7SvOdG_formSelect:focus{border-color:var(--dsw-alias-state-business-primary);outline:none}._7SvOdG_formJson{width:100%;min-height:220px;font-family:var(--ds-font-family-code);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);resize:vertical;white-space:pre;border-radius:8px;padding:10px 12px;font-size:12px;line-height:18px;overflow:auto}._7SvOdG_formJson:focus{border-color:var(--dsw-alias-state-business-primary);outline:none}._7SvOdG_formError{color:var(--dsw-alias-state-danger,#e5484d);margin:0;font-size:12px}._7SvOdG_mcpNotice{color:var(--dsw-alias-state-success,#2f9e44);margin:0;font-size:12px}._7SvOdG_mcpActionError{color:var(--dsw-alias-state-danger,#e5484d);margin:0;font-size:12px}";
		const tagId = "@zhang-guo-wen/dsh-claude-compat/ContextInjectionSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var ContextInjectionSection_module_css_default = {
			"intro": "_7SvOdG_intro",
			"switchSectionLabel": "_7SvOdG_switchSectionLabel",
			"modeOption": "_7SvOdG_modeOption",
			"mcpNotice": "_7SvOdG_mcpNotice",
			"formField": "_7SvOdG_formField",
			"modeDesc": "_7SvOdG_modeDesc",
			"badge": "_7SvOdG_badge",
			"mcpDesc": "_7SvOdG_mcpDesc",
			"tabs": "_7SvOdG_tabs",
			"promptArea": "_7SvOdG_promptArea",
			"fieldHint": "_7SvOdG_fieldHint",
			"status": "_7SvOdG_status",
			"mcpToolbar": "_7SvOdG_mcpToolbar",
			"mcpRetry": "_7SvOdG_mcpRetry",
			"mcpAction": "_7SvOdG_mcpAction",
			"modeGroup": "_7SvOdG_modeGroup",
			"mcpName": "_7SvOdG_mcpName",
			"switchLabel": "_7SvOdG_switchLabel",
			"tab": "_7SvOdG_tab",
			"empty": "_7SvOdG_empty",
			"unavailable": "_7SvOdG_unavailable",
			"mcpForm": "_7SvOdG_mcpForm",
			"switchRow": "_7SvOdG_switchRow",
			"formSelect": "_7SvOdG_formSelect",
			"fieldLabel": "_7SvOdG_fieldLabel",
			"formLabel": "_7SvOdG_formLabel",
			"formError": "_7SvOdG_formError",
			"modeBlock": "_7SvOdG_modeBlock",
			"mcpList": "_7SvOdG_mcpList",
			"switchFiles": "_7SvOdG_switchFiles",
			"field": "_7SvOdG_field",
			"panel": "_7SvOdG_panel",
			"formJson": "_7SvOdG_formJson",
			"modeOptionActive": "_7SvOdG_modeOptionActive",
			"mcpSub": "_7SvOdG_mcpSub",
			"mcpActions": "_7SvOdG_mcpActions",
			"switchText": "_7SvOdG_switchText",
			"mcpMain": "_7SvOdG_mcpMain",
			"section": "_7SvOdG_section",
			"mcpFailure": "_7SvOdG_mcpFailure",
			"mcpActionError": "_7SvOdG_mcpActionError",
			"modeName": "_7SvOdG_modeName",
			"mcpStatus": "_7SvOdG_mcpStatus",
			"mcpRight": "_7SvOdG_mcpRight",
			"switchDesc": "_7SvOdG_switchDesc",
			"mcpRow": "_7SvOdG_mcpRow"
		};
		//#endregion
		//#region src/client/McpEditor.tsx
		/** Plugin-owned description key for one row (`global:<name>` or `preset:<id>:<name>`). */
		function descriptionKey(scope, agentPreset, serverName) {
			return scope === "preset" ? `preset:${agentPreset}:${serverName}` : `global:${serverName}`;
		}
		/** Flatten a spec into a Claude-shaped object (spec fields at the top level). */
		function flattenSpec(spec) {
			if (spec.type === "stdio") return {
				type: "stdio",
				command: spec.command,
				...spec.args === void 0 ? {} : { args: spec.args },
				...spec.env === void 0 ? {} : { env: spec.env },
				...spec.cwd === void 0 ? {} : { cwd: spec.cwd }
			};
			return {
				type: spec.type,
				url: spec.url,
				...spec.headers === void 0 ? {} : { headers: spec.headers }
			};
		}
		/** The connection-spec JSON prefilled in the box (no scope/title — those are fields). */
		function specJson(describe) {
			const spec = describe?.spec ?? {
				type: "stdio",
				command: "",
				args: [],
				env: {}
			};
			return JSON.stringify(flattenSpec(spec), null, 2);
		}
		/** Read one spec object (Claude-shaped fields) into the normalized spec. */
		function specFromObject(candidate, invalid) {
			const declared = candidate.type;
			const type = declared === void 0 ? typeof candidate.command === "string" ? "stdio" : typeof candidate.url === "string" ? "streamable-http" : void 0 : declared;
			if (type === "stdio") {
				const command = candidate.command;
				if (typeof command !== "string" || command.trim() === "") throw new Error(invalid);
				const args = Array.isArray(candidate.args) ? candidate.args.map(String) : void 0;
				const env = candidate.env !== null && typeof candidate.env === "object" && !Array.isArray(candidate.env) ? Object.fromEntries(Object.entries(candidate.env).map(([k, v]) => [k, String(v)])) : void 0;
				const cwd = typeof candidate.cwd === "string" ? candidate.cwd : void 0;
				return {
					type: "stdio",
					command,
					...args === void 0 ? {} : { args },
					...env === void 0 ? {} : { env },
					...cwd === void 0 ? {} : { cwd }
				};
			}
			if (type === "streamable-http" || type === "http" || type === "sse") {
				const url = candidate.url;
				if (typeof url !== "string" || url.trim() === "") throw new Error(invalid);
				const headers = candidate.headers !== null && typeof candidate.headers === "object" && !Array.isArray(candidate.headers) ? Object.fromEntries(Object.entries(candidate.headers).map(([k, v]) => [k, String(v)])) : void 0;
				return {
					type,
					url,
					...headers === void 0 ? {} : { headers }
				};
			}
			throw new Error(invalid);
		}
		/**
		* Parse the connection JSON. Accepts a flat spec, a single-entry named map
		* (`{ "<name>": { command|url } }`), or a Claude `mcpServers` wrapper; a name
		* carried in the JSON is returned so the editor can fill an empty title.
		*/
		function parseSpec(text, invalid) {
			let value;
			try {
				value = JSON.parse(text);
			} catch {
				throw new Error(invalid);
			}
			if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(invalid);
			let root = value;
			if (root.mcpServers !== null && typeof root.mcpServers === "object" && !Array.isArray(root.mcpServers)) root = root.mcpServers;
			let serverName;
			if (root.type === void 0 && root.command === void 0 && root.url === void 0) {
				const pairs = Object.entries(root);
				if (pairs.length !== 1) throw new Error(invalid);
				const [name, entry] = pairs[0];
				if (entry === null || typeof entry !== "object" || Array.isArray(entry)) throw new Error(invalid);
				serverName = name;
				root = entry;
			}
			return {
				spec: specFromObject(root, invalid),
				...serverName === void 0 ? {} : { serverName }
			};
		}
		/** Modal editor: one scope dropdown, title/description fields, and a JSON spec box. */
		function McpEditor({ open, mode, server, disabled, busy, error, describeMcp, presets, descriptionInitial, onUpdateDescription, t, onClose, onSubmit }) {
			const [scopeValue, setScopeValue] = (0, react.useState)(server?.scope === "preset" ? server.presetId ?? "" : "");
			const [presetOptions, setPresetOptions] = (0, react.useState)([]);
			const [title, setTitle] = (0, react.useState)(server?.serverName ?? "");
			const [description, setDescription] = (0, react.useState)(descriptionInitial);
			const [json, setJson] = (0, react.useState)("");
			const [localError, setLocalError] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
			const editKey = `${server?.scope ?? ""}:${server?.presetId ?? ""}:${server?.entryId ?? ""}`;
			(0, react.useEffect)(() => {
				if (!open) return;
				let current = true;
				setLocalError(null);
				setScopeValue(server?.scope === "preset" ? server.presetId ?? "" : "");
				setTitle(server?.serverName ?? "");
				setDescription(descriptionInitial);
				presets().then((list) => {
					if (current) setPresetOptions(list);
				}, () => {
					if (current) setPresetOptions([]);
				});
				if (mode === "edit" && server?.entryId) {
					setLoading(true);
					describeMcp({
						target: server.scope === "global" ? { scope: "global" } : {
							scope: "preset",
							agentPreset: server.presetId ?? ""
						},
						entryId: server.entryId
					}).then((described) => {
						if (current) {
							setJson(specJson(described));
							setLoading(false);
						}
					}, () => {
						if (current) {
							setJson(specJson(void 0));
							setLoading(false);
						}
					});
				} else setJson(specJson(void 0));
				return () => {
					current = false;
				};
			}, [
				editKey,
				mode,
				open,
				server,
				descriptionInitial,
				presets,
				t
			]);
			const submit = () => {
				try {
					const parsed = parseSpec(json, t("mcp.form.jsonInvalid"));
					const serverName = (title.trim() !== "" ? title.trim() : parsed.serverName ?? "").trim();
					if (serverName === "") throw new Error(t("mcp.form.required"));
					const spec = parsed.spec;
					const target = scopeValue === "" ? { scope: "global" } : {
						scope: "preset",
						agentPreset: scopeValue
					};
					const entryId = mode === "edit" ? server?.entryId ?? "" : void 0;
					if (mode === "edit" && entryId === "") throw new Error(t("mcp.form.required"));
					onSubmit({
						target,
						serverName,
						spec,
						...entryId === void 0 ? {} : { entryId }
					});
					if (description.trim() !== "") onUpdateDescription(descriptionKey(scopeValue === "" ? "global" : "preset", scopeValue, serverName), description.trim());
				} catch (cause) {
					setLocalError(cause instanceof Error ? cause.message : t("mcp.form.jsonInvalid"));
				}
			};
			const formDisabled = disabled || busy;
			const titleText = mode === "add" ? t("mcp.form.addTitle") : t("mcp.form.editTitle");
			const showsCurrentPreset = scopeValue !== "" && !presetOptions.some((option) => option.id === scopeValue);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title: titleText,
				closeLabel: t("mcp.form.close"),
				description: t("mcp.form.hint"),
				contentClassName: ContextInjectionSection_module_css_default.mcpEditorContent ?? "",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ContextInjectionSection_module_css_default.formActions,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						size: "sm",
						onClick: onClose,
						disabled: busy,
						children: t("mcp.form.cancel")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						size: "sm",
						onClick: submit,
						disabled: formDisabled,
						children: busy ? t("mcp.form.saving") : t("mcp.form.save")
					})]
				}),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ContextInjectionSection_module_css_default.mcpForm,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: ContextInjectionSection_module_css_default.formField,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ContextInjectionSection_module_css_default.formLabel,
								children: t("mcp.form.scope")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: ContextInjectionSection_module_css_default.formSelect,
								value: scopeValue,
								disabled: formDisabled || mode === "edit",
								"aria-label": t("mcp.form.scope"),
								onChange: (event) => {
									setScopeValue(event.currentTarget.value);
									setLocalError(null);
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: t("mcp.scopeGlobal")
									}),
									presetOptions.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: option.id,
										children: option.name
									}, option.id)),
									showsCurrentPreset ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: scopeValue,
										children: scopeValue
									}) : null
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: ContextInjectionSection_module_css_default.formField,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ContextInjectionSection_module_css_default.formLabel,
								children: t("mcp.form.serverName")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								value: title,
								disabled: formDisabled,
								"aria-label": t("mcp.form.serverName"),
								onChange: (event) => {
									setTitle(event.currentTarget.value);
									setLocalError(null);
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: ContextInjectionSection_module_css_default.formField,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ContextInjectionSection_module_css_default.formLabel,
								children: t("mcp.form.description")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								value: description,
								disabled: formDisabled,
								"aria-label": t("mcp.form.description"),
								onChange: (event) => {
									setDescription(event.currentTarget.value);
									setLocalError(null);
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: ContextInjectionSection_module_css_default.formField,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ContextInjectionSection_module_css_default.formLabel,
								children: t("mcp.form.json")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: ContextInjectionSection_module_css_default.formJson,
								value: json,
								disabled: formDisabled,
								spellCheck: false,
								"aria-label": t("mcp.form.json"),
								onChange: (event) => {
									setJson(event.currentTarget.value);
									setLocalError(null);
								}
							})]
						}),
						loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.mcpStatus,
							children: t("mcp.loading")
						}) : null,
						localError !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.formError,
							role: "alert",
							children: localError
						}) : null,
						error !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.formError,
							role: "alert",
							children: error
						}) : null
					]
				})
			});
		}
		//#endregion
		//#region src/client/settings-controller.ts
		/** Settings namespace registered Host-side by @deepseek-ai/dsh-claude-compat. */
		const CONTEXT_INJECTION_NS = "context-injection";
		/** Stable key for a plugin-owned MCP description (`<scope>:<name>` or `preset:<id>:<name>`). */
		function mcpDescriptionKey(server) {
			return server.scope === "preset" ? `preset:${server.presetId ?? ""}:${server.serverName}` : `${server.scope}:${server.serverName}`;
		}
		/**
		* The local Loader row id from a loader-qualified id. A global mcp-client row
		* is addressed as `<includePath>:<id>`, and the host writes `serverName` into
		* the row's config; in the default add flow the local id equals that name.
		* @param qualified - loader-qualified entry id.
		* @returns the id segment after the last `:` separator.
		*/
		function localEntryId(qualified) {
			const separator = qualified.lastIndexOf(":");
			return separator < 0 ? qualified : qualified.slice(separator + 1);
		}
		/** The MCP loading modes in display order. */
		const MCP_LOADING_OPTIONS = [
			"eager",
			"dynamic",
			"lazy"
		];
		/**
		* Project a Host plugin-inventory snapshot onto the MCP roster, keeping every
		* mcp-client occurrence (global plane plus each preset composition) without
		* deduplicating cross-scope repeats. Descriptions are not read here — they are
		* plugin-owned and merged by the section from the `mcpDescriptions` map.
		* @param snapshot - the load-time inventory read from the Host.
		* @returns one row per mcp-client occurrence, tagged with its config scope.
		*/
		function mapMcpServers(snapshot) {
			const rows = [];
			for (const entry of snapshot.entries) {
				if (entry.moduleName !== "@deepseek-ai/dsh-mcp-client") continue;
				rows.push({
					entryId: entry.entryId,
					serverName: localEntryId(entry.entryId),
					scope: "global",
					presetId: void 0,
					enabled: entry.enabled,
					fiberPhase: entry.fiberPhase
				});
			}
			for (const preset of snapshot.agentPresets ?? []) for (const row of preset.rows) {
				if (row.moduleName !== "@deepseek-ai/dsh-mcp-client") continue;
				rows.push({
					entryId: row.entryId,
					serverName: localEntryId(row.entryId ?? row.moduleName),
					scope: "preset",
					presetId: preset.id,
					enabled: row.enabled,
					fiberPhase: row.fiberPhase
				});
			}
			return rows;
		}
		/** Owner handle over the `context-injection` namespace. */
		var ContextInjectionController = class {
			scope;
			mcps;
			authoring;
			presets;
			store;
			unsubscribe;
			/**
			* @param scope - bound `context-injection` settings scope.
			* @param mcps - Host-backed MCP roster loader.
			* @param authoring - Host-backed MCP mutation callbacks.
			*/
			constructor(scope, mcps, authoring, presets) {
				this.scope = scope;
				this.mcps = mcps;
				this.authoring = authoring;
				this.presets = presets;
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
					},
					updateMcpDescription: (key, description) => {
						this.updateMcpDescription(key, description);
					},
					setMcpLoading: (mode) => {
						this.setMcpLoading(mode);
					},
					addMcp: this.authoring.addMcp,
					editMcp: this.authoring.editMcp,
					disableMcp: this.authoring.disableMcp,
					describeMcp: this.authoring.describeMcp,
					mcps: this.mcps,
					presets: this.presets
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
			updateMcpDescription(key, description) {
				const snapshot = this.scope.getSnapshot();
				if (snapshot.status !== "ready" || !snapshot.writable) return;
				const next = { ...snapshot.value?.mcpDescriptions ?? {} };
				if (description === "") Reflect.deleteProperty(next, key);
				else next[key] = description;
				this.scope.set("mcpDescriptions", next);
			}
			setMcpLoading(mode) {
				const snapshot = this.scope.getSnapshot();
				if (snapshot.status !== "ready" || !snapshot.writable) return;
				if (snapshot.value?.mcpLoading === mode) return;
				this.scope.set("mcpLoading", mode);
			}
			projection() {
				const snapshot = this.scope.getSnapshot();
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					claude: snapshot.value?.claude ?? true,
					codex: snapshot.value?.codex ?? true,
					systemPrompt: snapshot.value?.systemPrompt ?? "",
					mcpDescriptions: snapshot.value?.mcpDescriptions ?? {},
					mcpLoading: snapshot.value?.mcpLoading ?? "dynamic"
				};
			}
			publish() {
				this.store.set(this.projection());
			}
		};
		//#endregion
		//#region src/client/ContextInjectionSection.tsx
		/**
		* Context-injection settings section: the Harness-compat page with two tabs.
		*
		* Tab "提示词管理" describes the default skill and CLAUDE.md / AGENTS.md loading
		* rules, edits a system-level prompt persisted to the `context-injection`
		* namespace (which the Host injects as a real system-prompt section), and holds
		* the two Claude/Codex rule-injection master toggles. Tab "MCP 管理" lists the
		* MCP servers the Host has configured — global plane plus every agent-preset
		* composition, surfaced without deduplication and tagged with its config scope.
		* @module @deepseek-ai/dsh-client-ui-context-injection/ContextInjectionSection
		*/
		/** Non-empty fiber-phase → localized status key. */
		const PHASE_LABEL = {
			pending: "mcp.status.pending",
			loading: "mcp.status.loading",
			active: "mcp.status.active",
			failed: "mcp.status.failed",
			unloading: "mcp.status.unloading"
		};
		/** Non-empty fiber-phase → state-dot semantic. */
		const PHASE_DOT = {
			pending: "idle",
			loading: "ongoing",
			active: "done",
			failed: "error",
			unloading: "ongoing"
		};
		/** MCP loading mode → localized option name. */
		const MODE_LABEL = {
			eager: "mcp.mode.eager",
			dynamic: "mcp.mode.dynamic",
			lazy: "mcp.mode.lazy"
		};
		/** MCP loading mode → localized one-line explanation. */
		const MODE_DESC = {
			eager: "mcp.mode.eager.desc",
			dynamic: "mcp.mode.dynamic.desc",
			lazy: "mcp.mode.lazy.desc"
		};
		/** Resolve one MCP row's displayed status label and dot. */
		function statusOf(server, t) {
			if (server.enabled === false) return {
				label: t("mcp.status.disabled"),
				dot: "idle"
			};
			if (server.enabled === "conditional") return {
				label: t("mcp.status.conditional"),
				dot: "warning"
			};
			if (server.fiberPhase === null) return {
				label: t("mcp.status.configured"),
				dot: "idle"
			};
			return {
				label: t(PHASE_LABEL[server.fiberPhase]),
				dot: PHASE_DOT[server.fiberPhase]
			};
		}
		/**
		* The MCP loading mode picker: one radio per mode, each carrying its own
		* one-line explanation so the trade-off (prompt cost and cache-prefix churn
		* against tool-binding quality) is readable without leaving the page.
		*/
		function McpLoadingPicker({ value, disabled, onPick, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ContextInjectionSection_module_css_default.modeBlock,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ContextInjectionSection_module_css_default.fieldLabel,
						children: t("mcp.mode.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ContextInjectionSection_module_css_default.fieldHint,
						children: t("mcp.mode.hint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ContextInjectionSection_module_css_default.modeGroup,
						role: "radiogroup",
						"aria-label": t("mcp.mode.title"),
						children: MCP_LOADING_OPTIONS.map((mode) => {
							const selected = value === mode;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "radio",
								"aria-checked": selected,
								"data-mcp-mode": mode,
								className: selected ? `${ContextInjectionSection_module_css_default.modeOption} ${ContextInjectionSection_module_css_default.modeOptionActive}` : ContextInjectionSection_module_css_default.modeOption,
								disabled,
								title: disabled ? t("unavailable") : void 0,
								onClick: () => {
									onPick(mode);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ContextInjectionSection_module_css_default.modeName,
									children: t(MODE_LABEL[mode])
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ContextInjectionSection_module_css_default.modeDesc,
									children: t(MODE_DESC[mode])
								})]
							}, mode);
						})
					})
				]
			});
		}
		/** One rendered MCP server row: name, plugin-owned description, scope, status, and row actions. */
		function McpRow({ server, description, pending, onEditDescription, onEdit, onToggleDisabled, actionsDisabled, t }) {
			const scope = server.scope === "global" ? t("mcp.scopeGlobal") : `${t("mcp.scopePreset")} · ${server.presetId ?? ""}`;
			const status = pending === "enabling" ? {
				label: t("mcp.status.starting"),
				dot: "warning"
			} : pending === "disabling" ? {
				label: t("mcp.status.stopping"),
				dot: "warning"
			} : statusOf(server, t);
			const checked = pending === "enabling" ? true : pending === "disabling" ? false : server.enabled !== false;
			const disabledNow = server.enabled === false;
			const [draft, setDraft] = (0, react.useState)(null);
			const value = draft ?? description;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ContextInjectionSection_module_css_default.mcpRow,
				"data-mcp-scope": server.scope,
				"data-mcp-name": server.serverName,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ContextInjectionSection_module_css_default.mcpMain,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ContextInjectionSection_module_css_default.mcpName,
						children: server.serverName
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: ContextInjectionSection_module_css_default.mcpDesc,
						value,
						placeholder: t("mcp.descriptionPlaceholder"),
						"aria-label": t("mcp.descriptionLabel"),
						onChange: (event) => {
							setDraft(event.currentTarget.value);
						},
						onBlur: () => {
							onEditDescription(value);
							setDraft(null);
						}
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ContextInjectionSection_module_css_default.mcpRight,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ContextInjectionSection_module_css_default.badge,
							children: scope
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ContextInjectionSection_module_css_default.status,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: status.dot }), status.label]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ContextInjectionSection_module_css_default.mcpActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ContextInjectionSection_module_css_default.mcpAction,
								disabled: actionsDisabled,
								onClick: onEdit,
								children: t("mcp.edit")
							}), server.entryId !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Switch, {
								checked,
								onChange: onToggleDisabled,
								label: disabledNow ? t("mcp.enable") : t("mcp.disable"),
								disabled: actionsDisabled || pending !== null,
								title: t("mcp.status.disabled")
							}) : null]
						})
					]
				})]
			});
		}
		/** The settings section body. */
		function ContextInjectionSection(props) {
			const { useContextInjection, t, toggle, updateSystemPrompt, updateMcpDescription, setMcpLoading, addMcp, editMcp, disableMcp, describeMcp, mcps, presets } = props;
			const state = useContextInjection((snapshot) => snapshot);
			const [activeTab, setActiveTab] = (0, react.useState)("prompt");
			const [promptDraft, setPromptDraft] = (0, react.useState)(null);
			const [mcpView, setMcpView] = (0, react.useState)({ status: "loading" });
			const [mcpRequest, setMcpRequest] = (0, react.useState)(0);
			const [editor, setEditor] = (0, react.useState)({
				mode: "add",
				server: void 0,
				open: false
			});
			const [editorBusy, setEditorBusy] = (0, react.useState)(false);
			const [editorError, setEditorError] = (0, react.useState)(null);
			const [mcpActionError, setMcpActionError] = (0, react.useState)(null);
			const [notice, setNotice] = (0, react.useState)(null);
			const [rowPending, setRowPending] = (0, react.useState)({});
			const disabled = !state.available || !state.writable;
			const promptValue = promptDraft ?? state.systemPrompt;
			(0, react.useEffect)(() => {
				let current = true;
				setMcpView({ status: "loading" });
				Promise.resolve().then(mcps).then((servers) => {
					if (current) setMcpView({
						status: "ready",
						servers
					});
				}, () => {
					if (current) setMcpView({ status: "error" });
				});
				return () => {
					current = false;
				};
			}, [mcps, mcpRequest]);
			const commitPrompt = () => {
				if (promptDraft === null) return;
				updateSystemPrompt(promptDraft);
			};
			const openAdd = () => {
				setEditor({
					mode: "add",
					server: void 0,
					open: true
				});
				setEditorError(null);
				setMcpActionError(null);
				setNotice(null);
			};
			const openEdit = (server) => {
				setEditor({
					mode: "edit",
					server,
					open: true
				});
				setEditorError(null);
				setMcpActionError(null);
				setNotice(null);
			};
			const closeEditor = () => {
				if (editorBusy) return;
				setEditor((previous) => ({
					...previous,
					open: false
				}));
				setEditorError(null);
			};
			const refreshMcps = () => {
				setMcpRequest((value) => value + 1);
			};
			const submitEditor = async (request) => {
				setEditorBusy(true);
				setEditorError(null);
				setMcpActionError(null);
				try {
					if (editor.mode === "add") await addMcp(request);
					else await editMcp(request);
					setEditor({
						mode: editor.mode,
						server: void 0,
						open: false
					});
					setNotice(editor.mode === "add" ? t("mcp.notice.added") : t("mcp.notice.saved"));
					refreshMcps();
				} catch (cause) {
					setEditorError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					setEditorBusy(false);
				}
			};
			/**
			* Flip one row's enablement without blocking the list. The row immediately
			* shows its target state and a transient starting/stopping label; the Host
			* call (which starts or stops the child MCP process) runs in the background
			* and the list refreshes with the real state when it settles.
			*/
			const toggleDisabled = (server, enabled) => {
				if (server.entryId === null) return;
				const key = mcpDescriptionKey(server);
				const target = server.scope === "global" ? { scope: "global" } : {
					scope: "preset",
					agentPreset: server.presetId ?? ""
				};
				setMcpActionError(null);
				setRowPending((previous) => ({
					...previous,
					[key]: enabled ? "enabling" : "disabling"
				}));
				(async () => {
					try {
						await disableMcp({
							target,
							entryId: server.entryId,
							disabled: !enabled
						});
						setNotice(enabled ? t("mcp.notice.enabled") : t("mcp.notice.disabled"));
					} catch (cause) {
						setMcpActionError(cause instanceof Error ? cause.message : String(cause));
					} finally {
						setRowPending((previous) => {
							const next = { ...previous };
							delete next[key];
							return next;
						});
						refreshMcps();
					}
				})();
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
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ContextInjectionSection_module_css_default.section,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ContextInjectionSection_module_css_default.tabs,
					role: "tablist",
					"aria-label": t("nav"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						className: ContextInjectionSection_module_css_default.tab,
						"aria-selected": activeTab === "prompt",
						"aria-controls": "context-injection-prompt",
						onClick: () => {
							setActiveTab("prompt");
						},
						children: t("tab.prompt")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						className: ContextInjectionSection_module_css_default.tab,
						"aria-selected": activeTab === "mcp",
						"aria-controls": "context-injection-mcp",
						onClick: () => {
							setActiveTab("mcp");
						},
						children: t("tab.mcp")
					})]
				}), activeTab === "prompt" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ContextInjectionSection_module_css_default.panel,
					id: "context-injection-prompt",
					role: "tabpanel",
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
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ContextInjectionSection_module_css_default.panel,
					id: "context-injection-mcp",
					role: "tabpanel",
					children: [
						!state.available ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.unavailable,
							children: t("unavailable")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpLoadingPicker, {
							value: state.mcpLoading,
							disabled,
							onPick: setMcpLoading,
							t
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ContextInjectionSection_module_css_default.mcpToolbar,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ContextInjectionSection_module_css_default.mcpSub,
								children: t("mcp.subtitle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								size: "sm",
								onClick: openAdd,
								disabled: editorBusy,
								children: t("mcp.add")
							})]
						}),
						mcpView.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.mcpStatus,
							children: t("mcp.loading")
						}) : null,
						mcpView.status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ContextInjectionSection_module_css_default.mcpFailure,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								role: "alert",
								children: t("mcp.error")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: ContextInjectionSection_module_css_default.mcpRetry,
								onClick: () => {
									setMcpRequest((value) => value + 1);
								},
								children: t("mcp.retry")
							})]
						}) : null,
						mcpView.status === "ready" && mcpView.servers.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.empty,
							children: t("mcp.empty")
						}) : null,
						mcpView.status === "ready" && mcpView.servers.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ContextInjectionSection_module_css_default.mcpList,
							children: mcpView.servers.map((server) => {
								const key = mcpDescriptionKey(server);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpRow, {
									server,
									description: server.description ?? state.mcpDescriptions[key] ?? "",
									pending: rowPending[key] ?? null,
									onEditDescription: (value) => {
										updateMcpDescription(key, value);
									},
									onEdit: () => {
										openEdit(server);
									},
									onToggleDisabled: (enabled) => {
										toggleDisabled(server, enabled);
									},
									actionsDisabled: editorBusy,
									t
								}, key);
							})
						}) : null,
						mcpActionError !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.mcpActionError,
							role: "alert",
							children: mcpActionError
						}) : null,
						notice !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: ContextInjectionSection_module_css_default.mcpNotice,
							role: "status",
							children: notice
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpEditor, {
							open: editor.open,
							mode: editor.mode,
							server: editor.server,
							disabled: false,
							busy: editorBusy,
							error: editorError,
							describeMcp,
							presets,
							descriptionInitial: editor.server === void 0 ? "" : editor.server.description ?? state.mcpDescriptions[mcpDescriptionKey(editor.server)] ?? "",
							onUpdateDescription: updateMcpDescription,
							t,
							onClose: closeEditor,
							onSubmit: (request) => {
								submitEditor(request);
							}
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Context-injection settings section dictionaries.
		* @module @deepseek-ai/dsh-client-ui-context-injection/locales
		*/
		/** Locale namespace owned by this plugin. */
		const NS = "settings.contextInjection";
		const zh = {
			"nav": "Claude 兼容",
			"tab.prompt": "提示词管理",
			"tab.mcp": "MCP 管理",
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
			"mcp.subtitle": "已加载的 MCP 服务器",
			"mcp.mode.title": "MCP 加载方式",
			"mcp.mode.hint": "决定会话把 MCP 服务器放进上下文的方式；切换后从下一次请求开始生效。",
			"mcp.mode.eager": "全部加载",
			"mcp.mode.eager.desc": "已启用的 MCP 全部挂载，工具始终在请求里。最省事，但每次请求都要付工具描述的 token。",
			"mcp.mode.dynamic": "动态插入",
			"mcp.mode.dynamic.desc": "默认不加载；需要时用 mcp_load 把服务器挂进当前会话。工具列表会变化一次，请求缓存前缀随之中断。",
			"mcp.mode.lazy": "延迟加载",
			"mcp.mode.lazy.desc": "默认不加载；需要时用 mcp_load 连接、用 mcp_call 调用。工具列表永不变化，请求缓存前缀不中断。",
			"mcp.add": "新增 MCP",
			"mcp.notice.added": "已新增 MCP 服务器",
			"mcp.notice.saved": "已保存 MCP 服务器",
			"mcp.notice.enabled": "已启用 MCP 服务器",
			"mcp.notice.disabled": "已禁用 MCP 服务器",
			"mcp.edit": "编辑",
			"mcp.enable": "启用",
			"mcp.disable": "禁用",
			"mcp.loading": "正在读取……",
			"mcp.error": "读取失败",
			"mcp.retry": "重试",
			"mcp.empty": "暂无已加载的 MCP 服务器",
			"mcp.scopeGlobal": "全局",
			"mcp.scopePreset": "预设",
			"mcp.descriptionPlaceholder": "添加描述",
			"mcp.descriptionLabel": "MCP 描述",
			"mcp.form.addTitle": "新增 MCP 服务器",
			"mcp.form.editTitle": "编辑 MCP 服务器",
			"mcp.form.close": "关闭",
			"mcp.form.hint": "粘贴 MCP 服务器的连接 JSON（Claude Code 兼容），保存时会解析校验。",
			"mcp.form.json": "JSON 配置",
			"mcp.form.jsonInvalid": "JSON 格式或字段不合法",
			"mcp.form.cancel": "取消",
			"mcp.form.save": "保存",
			"mcp.form.saving": "保存中……",
			"mcp.form.required": "请填写必填项",
			"mcp.form.invalidKeyValue": "KEY=VALUE 格式无效",
			"mcp.form.scope": "配置范围",
			"mcp.form.preset": "预设 ID",
			"mcp.form.entryId": "行 ID",
			"mcp.form.entryIdPlaceholder": "默认为服务器名",
			"mcp.form.serverName": "服务器名",
			"mcp.form.description": "描述",
			"mcp.form.transport": "传输方式",
			"mcp.form.stdio": "stdio（本地进程）",
			"mcp.form.streamableHttp": "Streamable HTTP",
			"mcp.form.http": "HTTP",
			"mcp.form.sse": "SSE",
			"mcp.form.command": "命令",
			"mcp.form.args": "参数（每行一个）",
			"mcp.form.argsPlaceholder": "--arg\n--flag",
			"mcp.form.env": "环境变量（每行 KEY=VALUE）",
			"mcp.form.keyValuePlaceholder": "KEY=VALUE",
			"mcp.form.cwd": "工作目录",
			"mcp.form.url": "URL",
			"mcp.form.headers": "请求头（每行 KEY=VALUE）",
			"mcp.status.disabled": "已禁用",
			"mcp.status.conditional": "条件启用",
			"mcp.status.configured": "已配置",
			"mcp.status.pending": "待加载",
			"mcp.status.loading": "加载中",
			"mcp.status.starting": "启动中",
			"mcp.status.stopping": "停止中",
			"mcp.status.active": "运行中",
			"mcp.status.failed": "加载失败",
			"mcp.status.unloading": "卸载中",
			"unavailable": "设置当前不可用"
		};
		const en = {
			"nav": "Claude Compat",
			"tab.prompt": "Prompt management",
			"tab.mcp": "MCP management",
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
			"mcp.subtitle": "Loaded MCP servers",
			"mcp.mode.title": "MCP loading",
			"mcp.mode.hint": "How a session folds MCP servers into context. A change applies from the next request on.",
			"mcp.mode.eager": "Load all",
			"mcp.mode.eager.desc": "Every enabled MCP server mounts up front, so its tools are always in the request. Simplest, and you pay the tool descriptions on every request.",
			"mcp.mode.dynamic": "Dynamic insert",
			"mcp.mode.dynamic.desc": "Nothing loads by default; mcp_load mounts a server into the calling session. The tool list changes once per load, which breaks the request-cache prefix.",
			"mcp.mode.lazy": "Lazy",
			"mcp.mode.lazy.desc": "Nothing loads by default; mcp_load connects and mcp_call invokes. The tool list never changes, so the request-cache prefix survives.",
			"mcp.add": "Add MCP",
			"mcp.notice.added": "MCP server added",
			"mcp.notice.saved": "MCP server saved",
			"mcp.notice.enabled": "MCP server enabled",
			"mcp.notice.disabled": "MCP server disabled",
			"mcp.edit": "Edit",
			"mcp.enable": "Enable",
			"mcp.disable": "Disable",
			"mcp.loading": "Loading…",
			"mcp.error": "Failed to read",
			"mcp.retry": "Retry",
			"mcp.empty": "No MCP servers loaded",
			"mcp.scopeGlobal": "Global",
			"mcp.scopePreset": "Preset",
			"mcp.descriptionPlaceholder": "Add description",
			"mcp.descriptionLabel": "MCP description",
			"mcp.form.addTitle": "Add MCP server",
			"mcp.form.editTitle": "Edit MCP server",
			"mcp.form.close": "Close",
			"mcp.form.hint": "Paste the MCP connection JSON (Claude Code compatible); it is parsed and validated on save.",
			"mcp.form.json": "JSON config",
			"mcp.form.jsonInvalid": "Invalid JSON format or fields",
			"mcp.form.cancel": "Cancel",
			"mcp.form.save": "Save",
			"mcp.form.saving": "Saving…",
			"mcp.form.required": "Required fields are missing",
			"mcp.form.invalidKeyValue": "Invalid KEY=VALUE line",
			"mcp.form.scope": "Config scope",
			"mcp.form.preset": "Preset ID",
			"mcp.form.entryId": "Row ID",
			"mcp.form.entryIdPlaceholder": "Defaults to the server name",
			"mcp.form.serverName": "Server name",
			"mcp.form.description": "Description",
			"mcp.form.transport": "Transport",
			"mcp.form.stdio": "stdio (local process)",
			"mcp.form.streamableHttp": "Streamable HTTP",
			"mcp.form.http": "HTTP",
			"mcp.form.sse": "SSE",
			"mcp.form.command": "Command",
			"mcp.form.args": "Arguments (one per line)",
			"mcp.form.argsPlaceholder": "--arg\n--flag",
			"mcp.form.env": "Environment (one KEY=VALUE per line)",
			"mcp.form.keyValuePlaceholder": "KEY=VALUE",
			"mcp.form.cwd": "Working directory",
			"mcp.form.url": "URL",
			"mcp.form.headers": "Headers (one KEY=VALUE per line)",
			"mcp.status.disabled": "Disabled",
			"mcp.status.conditional": "Conditional",
			"mcp.status.configured": "Configured",
			"mcp.status.pending": "Pending",
			"mcp.status.loading": "Loading",
			"mcp.status.starting": "Starting",
			"mcp.status.stopping": "Stopping",
			"mcp.status.active": "Running",
			"mcp.status.failed": "Failed to load",
			"mcp.status.unloading": "Unloading",
			"unavailable": "Setting currently unavailable"
		};
		//#endregion
		//#region src/remote.ts
		/** Wire namespace and Cordis service key of the MCP authoring owner. */
		const REMOTE_NAMESPACE = "claudeCompatMcp";
		/** Permissive strict codec: accepts any value, returns it unchanged. */
		const passthrough = { parse: (value) => value };
		function codec(typeSymbol) {
			return {
				mode: "strict",
				typeSymbol,
				schema: passthrough
			};
		}
		function descriptor(method) {
			const owner = `@zhang-guo-wen/dsh-claude-compat#${`${REMOTE_NAMESPACE}/${method}`}`;
			return {
				id: owner,
				service: REMOTE_NAMESPACE,
				namespace: REMOTE_NAMESPACE,
				method,
				invocation: { kind: "direct" },
				parameters: [{
					name: "request",
					wire: "request",
					source: "json",
					codec: codec(`${owner}:request`)
				}],
				result: codec(`${owner}:result`)
			};
		}
		/** Contribution mounted by the browser half to reach the MCP authoring owner. */
		const TYPERT_REMOTE = {
			package: "@zhang-guo-wen/dsh-claude-compat",
			descriptors: [
				descriptor("addMcp"),
				descriptor("editMcp"),
				descriptor("disableMcp"),
				descriptor("describeMcp")
			]
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"settingsScope",
			"remote",
			"remote.pluginInventory"
		];
		/** Unwrap a Typert `RemoteResult` or surface the Host failure. */
		async function unwrapRemote(call) {
			const result = await call();
			if (!result.ok) throw new Error(result.error.message);
			return result.value;
		}
		/**
		* Register the dictionaries and the context-injection settings section.
		* @param ctx - client root context.
		*/
		async function apply(ctx) {
			const disposeMount = await ctx.remote.$mount(TYPERT_REMOTE);
			ctx.effect(() => () => disposeMount(), "claude-compat: remote mount");
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-context-injection: dictionaries");
			const t = ctx.locale.bind(NS);
			const mcps = async () => {
				const result = await ctx.remote.pluginInventory.list();
				if (!result.ok) throw new Error(`pluginInventory.list failed: ${result.error.code}: ${result.error.message}`);
				return mapMcpServers(result.value);
			};
			const mcpMgr = () => {
				const namespace = ctx.get(`remote.${REMOTE_NAMESPACE}`);
				if (namespace === void 0) throw new Error(`${REMOTE_NAMESPACE} namespace service is not mounted`);
				return namespace;
			};
			const authoring = {
				addMcp: (request) => unwrapRemote(() => mcpMgr().addMcp(request)),
				editMcp: (request) => unwrapRemote(() => mcpMgr().editMcp(request)),
				disableMcp: (request) => unwrapRemote(() => mcpMgr().disableMcp(request)),
				describeMcp: (request) => unwrapRemote(() => mcpMgr().describeMcp(request))
			};
			const presets = async () => {
				const result = await ctx.remote.pluginInventory.list();
				if (!result.ok) throw new Error(`pluginInventory.list failed: ${result.error.code}: ${result.error.message}`);
				return (result.value.agentPresets ?? []).map((group) => ({
					id: group.id,
					name: group.name ?? group.id
				}));
			};
			const controller = new ContextInjectionController(ctx.settingsScope.bind({ namespace: CONTEXT_INJECTION_NS }), mcps, authoring, presets);
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
