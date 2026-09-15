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
		const css$1 = "._2xcSla_section{flex-direction:column;gap:16px;width:100%;max-width:720px;display:flex}._2xcSla_tabs{background:var(--dsw-alias-bg-module-platform);border-radius:12px;align-self:flex-start;align-items:center;gap:2px;padding:3px;display:inline-flex}._2xcSla_tab{color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:9px;padding:7px 16px;font-size:13px;line-height:20px}._2xcSla_tab:hover{color:var(--dsw-alias-label-secondary)}._2xcSla_tab:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}._2xcSla_tab[aria-selected=true]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-elevation-stroke);font-weight:600}._2xcSla_panel{flex-direction:column;gap:16px;display:flex}._2xcSla_intro{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;white-space:pre-line;border-radius:12px;margin:0;padding:14px 16px;font-size:13px;line-height:22px}._2xcSla_field{flex-direction:column;gap:7px;display:flex}._2xcSla_fieldLabel{font-size:13px;font-weight:600}._2xcSla_fieldHint{color:var(--dsw-alias-label-tertiary);font-size:12px}._2xcSla_promptArea{box-sizing:border-box;resize:vertical;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-1);width:100%;min-height:132px;color:var(--dsw-alias-label-primary);font-family:var(--ds-font-family-code);border-radius:12px;outline:none;padding:12px 14px;font-size:12.5px;line-height:19px}._2xcSla_promptArea::placeholder{color:var(--dsw-alias-label-tertiary)}._2xcSla_promptArea:focus{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent)}._2xcSla_promptArea:disabled{opacity:.6;cursor:not-allowed}._2xcSla_switchSectionLabel{text-transform:uppercase;letter-spacing:.06em;color:var(--dsw-alias-label-tertiary);margin:4px 0 0;font-size:11px;font-weight:600}._2xcSla_switchRow{border-bottom:.5px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:16px;padding:12px 0;display:flex}._2xcSla_switchRow:last-child{border-bottom:0}._2xcSla_switchText{flex-direction:column;gap:2px;min-width:0;display:flex}._2xcSla_switchLabel{font-size:13px;font-weight:600}._2xcSla_switchDesc{color:var(--dsw-alias-label-secondary);font-size:12px}._2xcSla_switchFiles{color:var(--dsw-alias-label-tertiary);font-size:11px;font-family:var(--ds-font-family-code);overflow-wrap:anywhere;margin-top:2px}._2xcSla_mcpSub{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12.5px;line-height:20px}._2xcSla_mcpToolbar{justify-content:space-between;align-items:center;gap:12px;display:flex}._2xcSla_modeBlock{flex-direction:column;gap:7px;display:flex}._2xcSla_modeGroup{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;display:grid}._2xcSla_modeOption{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;border-radius:12px;flex-direction:column;align-items:flex-start;gap:4px;padding:10px 12px;display:flex}._2xcSla_modeOption:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}._2xcSla_modeOption:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}._2xcSla_modeOption:disabled{opacity:.55;cursor:not-allowed}._2xcSla_modeOptionActive{border-color:var(--dsw-alias-state-business-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-state-business-primary)}._2xcSla_modeName{font-size:13px;font-weight:600}._2xcSla_modeDesc{color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:17px}._2xcSla_mcpList{flex-direction:column;gap:10px;display:flex}._2xcSla_mcpRow{background:var(--dsw-alias-bg-layer-1);box-shadow:var(--dsw-elevation-stroke);border-radius:12px;justify-content:space-between;align-items:center;gap:14px;padding:12px 14px;display:flex}._2xcSla_mcpMain{flex-direction:column;gap:3px;min-width:0;display:flex}._2xcSla_mcpName{font-size:14px;font-weight:600;font-family:var(--ds-font-family-code)}._2xcSla_mcpDesc{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;background:0 0;border:0;outline:none;padding:0;font-family:inherit;font-size:12px;line-height:18px}._2xcSla_mcpDesc::placeholder{color:var(--dsw-alias-label-tertiary);opacity:.7}._2xcSla_mcpDesc:focus{color:var(--dsw-alias-label-primary);border-bottom:1px solid var(--dsw-alias-state-business-primary)}._2xcSla_mcpRight{flex:none;align-items:center;gap:10px;display:inline-flex}._2xcSla_badge{corner-shape:round;border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:999px;padding:2px 8px;font-size:11px}._2xcSla_status{color:var(--dsw-alias-label-secondary);align-items:center;gap:6px;font-size:12px;display:inline-flex}._2xcSla_mcpActions{align-items:center;gap:8px;display:inline-flex}._2xcSla_mcpAction{appearance:none;border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);cursor:pointer;white-space:nowrap;background:0 0;border-radius:6px;padding:4px 10px;font-size:12px}._2xcSla_mcpAction:hover{background:var(--dsw-alias-bg-layer-2)}._2xcSla_mcpAction:disabled{opacity:.5;cursor:not-allowed}._2xcSla_mcpStatus{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}._2xcSla_mcpFailure{color:var(--dsw-alias-state-error-primary);align-items:center;gap:10px;display:flex}._2xcSla_mcpFailure p{margin:0;font-size:13px}._2xcSla_mcpRetry{border:.5px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:6px;padding:4px 10px;font-size:12px}._2xcSla_mcpRetry:hover{background:var(--dsw-alias-interactive-bg-hover)}._2xcSla_empty,._2xcSla_unavailable{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px}._2xcSla_mcpForm{flex-direction:column;gap:12px;display:flex}._2xcSla_formField{flex-direction:column;gap:6px;display:flex}._2xcSla_formLabel{color:var(--dsw-alias-label-secondary);font-size:12px}._2xcSla_formSelect{border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;color:var(--dsw-alias-label-primary);border-radius:8px;padding:8px 10px;font-size:13px}._2xcSla_formSelect:focus{border-color:var(--dsw-alias-state-business-primary);outline:none}._2xcSla_formJson{width:100%;min-height:220px;font-family:var(--ds-font-family-code);border:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);resize:vertical;white-space:pre;border-radius:8px;padding:10px 12px;font-size:12px;line-height:18px;overflow:auto}._2xcSla_formJson:focus{border-color:var(--dsw-alias-state-business-primary);outline:none}._2xcSla_formError{color:var(--dsw-alias-state-danger,#e5484d);margin:0;font-size:12px}._2xcSla_mcpNotice{color:var(--dsw-alias-state-success,#2f9e44);margin:0;font-size:12px}._2xcSla_mcpActionError{color:var(--dsw-alias-state-danger,#e5484d);margin:0;font-size:12px}";
		const tagId$1 = "@zhang-guo-wen/dsh-claude-compat/ContextInjectionSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var ContextInjectionSection_module_css_default = {
			"badge": "_2xcSla_badge",
			"empty": "_2xcSla_empty",
			"field": "_2xcSla_field",
			"fieldHint": "_2xcSla_fieldHint",
			"fieldLabel": "_2xcSla_fieldLabel",
			"formError": "_2xcSla_formError",
			"formField": "_2xcSla_formField",
			"formJson": "_2xcSla_formJson",
			"formLabel": "_2xcSla_formLabel",
			"formSelect": "_2xcSla_formSelect",
			"intro": "_2xcSla_intro",
			"mcpAction": "_2xcSla_mcpAction",
			"mcpActionError": "_2xcSla_mcpActionError",
			"mcpActions": "_2xcSla_mcpActions",
			"mcpDesc": "_2xcSla_mcpDesc",
			"mcpFailure": "_2xcSla_mcpFailure",
			"mcpForm": "_2xcSla_mcpForm",
			"mcpList": "_2xcSla_mcpList",
			"mcpMain": "_2xcSla_mcpMain",
			"mcpName": "_2xcSla_mcpName",
			"mcpNotice": "_2xcSla_mcpNotice",
			"mcpRetry": "_2xcSla_mcpRetry",
			"mcpRight": "_2xcSla_mcpRight",
			"mcpRow": "_2xcSla_mcpRow",
			"mcpStatus": "_2xcSla_mcpStatus",
			"mcpSub": "_2xcSla_mcpSub",
			"mcpToolbar": "_2xcSla_mcpToolbar",
			"modeBlock": "_2xcSla_modeBlock",
			"modeDesc": "_2xcSla_modeDesc",
			"modeGroup": "_2xcSla_modeGroup",
			"modeName": "_2xcSla_modeName",
			"modeOption": "_2xcSla_modeOption",
			"modeOptionActive": "_2xcSla_modeOptionActive",
			"panel": "_2xcSla_panel",
			"promptArea": "_2xcSla_promptArea",
			"section": "_2xcSla_section",
			"status": "_2xcSla_status",
			"switchDesc": "_2xcSla_switchDesc",
			"switchFiles": "_2xcSla_switchFiles",
			"switchLabel": "_2xcSla_switchLabel",
			"switchRow": "_2xcSla_switchRow",
			"switchSectionLabel": "_2xcSla_switchSectionLabel",
			"switchText": "_2xcSla_switchText",
			"tab": "_2xcSla_tab",
			"tabs": "_2xcSla_tabs",
			"unavailable": "_2xcSla_unavailable"
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
			suppressed;
			store;
			unsubscribe;
			/**
			* @param scope - bound `context-injection` settings scope.
			* @param mcps - Host-backed MCP roster loader.
			* @param authoring - Host-backed MCP mutation callbacks.
			* @param presets - Host-backed agent-preset options loader.
			* @param suppressed - Host-backed reader of the rows the gate holds unmounted.
			*/
			constructor(scope, mcps, authoring, presets, suppressed) {
				this.scope = scope;
				this.mcps = mcps;
				this.authoring = authoring;
				this.presets = presets;
				this.suppressed = suppressed;
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
					setMcpLoading: (mode) => this.setMcpLoading(mode),
					addMcp: this.authoring.addMcp,
					editMcp: this.authoring.editMcp,
					disableMcp: this.authoring.disableMcp,
					describeMcp: this.authoring.describeMcp,
					suppressedMcps: this.suppressed,
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
				if (snapshot.status !== "ready" || !snapshot.writable) return Promise.resolve();
				if (snapshot.value?.mcpLoading === mode) return Promise.resolve();
				return this.scope.set("mcpLoading", mode);
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
		function statusOf(server, suppressed, t) {
			if (server.enabled === false) return suppressed ? {
				label: t("mcp.status.deferred"),
				dot: "idle"
			} : {
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
		function McpRow({ server, description, suppressed, pending, onEditDescription, onEdit, onToggleDisabled, actionsDisabled, t }) {
			const scope = server.scope === "global" ? t("mcp.scopeGlobal") : `${t("mcp.scopePreset")} · ${server.presetId ?? ""}`;
			const status = pending === "enabling" ? {
				label: t("mcp.status.starting"),
				dot: "warning"
			} : pending === "disabling" ? {
				label: t("mcp.status.stopping"),
				dot: "warning"
			} : statusOf(server, suppressed, t);
			const checked = pending === "enabling" ? true : pending === "disabling" ? false : server.enabled !== false || suppressed;
			const disabledNow = server.enabled === false && !suppressed;
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
			const { useContextInjection, t, toggle, updateSystemPrompt, updateMcpDescription, setMcpLoading, addMcp, editMcp, disableMcp, describeMcp, suppressedMcps, mcps, presets } = props;
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
				Promise.resolve().then(suppressedMcps).catch((error) => {
					console.error("[claude-compat] MCP gate read failed", error);
					return [];
				}).then(async (suppressed) => ({
					suppressed,
					servers: await mcps()
				})).then(({ servers, suppressed }) => {
					if (current) setMcpView({
						status: "ready",
						servers,
						suppressed: new Set(suppressed)
					});
				}, () => {
					if (current) setMcpView({ status: "error" });
				});
				return () => {
					current = false;
				};
			}, [
				mcps,
				suppressedMcps,
				mcpRequest
			]);
			const commitPrompt = () => {
				if (promptDraft === null) return;
				updateSystemPrompt(promptDraft);
			};
			/**
			* Persisting the mode changes which rows are mounted, so the roster is
			* re-read once the Host has applied it: the gate read resolves only after
			* every composed row reached its new state.
			*/
			const pickMode = (mode) => {
				Promise.resolve().then(() => setMcpLoading(mode)).then(suppressedMcps).catch(() => []).then(() => {
					refreshMcps();
				});
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
							onPick: pickMode,
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
									suppressed: mcpView.suppressed.has(key),
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
			"mcp.mode.hint": "启用 = 允许使用这台 MCP；这一项决定允许的服务器什么时候进上下文。禁用 = 完全不用：不出现在工具列表，也不能 mcp_load。",
			"mcp.mode.eager": "全部加载",
			"mcp.mode.eager.desc": "允许的服务器在会话开始时就挂载，工具始终在请求里。最省事，但每次请求都要付工具描述的 token。",
			"mcp.mode.dynamic": "动态插入",
			"mcp.mode.dynamic.desc": "允许的服务器默认不挂载；需要时用 mcp_load 把它挂进当前会话。工具列表会变化一次，请求缓存前缀随之中断。",
			"mcp.mode.lazy": "延迟加载",
			"mcp.mode.lazy.desc": "允许的服务器默认不挂载；需要时用 mcp_load 连接、用 mcp_call 调用。工具列表永不变化，请求缓存前缀不中断。",
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
			"mcp.status.deferred": "待加载",
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
			"mcp.mode.hint": "Enabled means the server may be used; this setting decides when an allowed server enters context. Disabled means never: it is not offered as a tool and cannot be loaded.",
			"mcp.mode.eager": "Load all",
			"mcp.mode.eager.desc": "Allowed servers mount at session start, so their tools are always in the request. Simplest, and you pay the tool descriptions on every request.",
			"mcp.mode.dynamic": "Dynamic insert",
			"mcp.mode.dynamic.desc": "Allowed servers stay unmounted by default; mcp_load mounts one into the calling session. The tool list changes once per load, which breaks the request-cache prefix.",
			"mcp.mode.lazy": "Lazy",
			"mcp.mode.lazy.desc": "Allowed servers stay unmounted by default; mcp_load connects one and mcp_call invokes it. The tool list never changes, so the request-cache prefix survives.",
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
			"mcp.status.deferred": "Deferred",
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
		/**
		* One strict codec over {@link passthrough}.
		*
		* Both schema seats carry the same parse contract because the Host's Typert
		* registry changed the strict codec shape: Hosts up to
		* `perf(typert): materialize generated schemas on first use` validate
		* `schema.parse`, later ones require a `create()` factory and call it when a
		* boundary first uses the codec (`validateCodec` rejects a strict codec
		* without it). The published `@deepseek-ai/dsh-typert-protocol` release this
		* package dev-depends on still declares `schema` alone, so the literal cannot
		* satisfy those types while carrying `create`; drop the assertion once a
		* published protocol version declares `create`.
		* @param typeSymbol - generated-style type symbol naming this codec.
		* @returns the strict codec handed to `ctx.remote.$mount`.
		*/
		function codec(typeSymbol) {
			return {
				mode: "strict",
				typeSymbol,
				schema: passthrough,
				create: () => passthrough
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
				descriptor("describeMcp"),
				descriptor("gateState")
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
			"remote.pluginInventory",
			"remote.session",
			"workspaces"
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
			const suppressedMcps = async () => unwrapRemote(() => mcpMgr().gateState({})).then((state) => state.suppressed);
			const controller = new ContextInjectionController(ctx.settingsScope.bind({ namespace: CONTEXT_INJECTION_NS }), mcps, authoring, presets, suppressedMcps);
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
