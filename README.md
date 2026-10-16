# dsh-claude-compat

English | [中文](<README.zh.md>)

## Background

Many projects already maintain skills, rules, and memory around Claude Code. This plugin makes those existing projects compatible with DeepSeek Harness by reusing their resources and optionally writing new memories. You can use DSH alongside Claude Code while maintaining just one set of resources, without separate migration or duplication.

In the plugin list, display names and descriptions follow the Harness language setting in English or Chinese (English is the default fallback); English names use the package name without its npm scope, Chinese names describe the purpose, and installation still uses the unchanged real package name.

## Screenshot

**Settings → Claude compatibility**: five switches cover skill loading, memory loading, auto-memory loading, memory writing, and rule loading. Each switch has exactly one line, and that line states **the state the switch is in** — what it loads and its byte limits while it is on, what its off state does while it is off. Under it every entry lists its label, load paths, and a one-line hint, and one footer line states when a switch change takes effect.

![Claude compatibility settings](<docs/images/claude-compat-settings.png>)

## Install from npm

```sh
npx @deepseek-ai/dsh plugin --profile web add @guowenzhang/dsh-claude-compat
```

Restart DSH after installation, then open **Settings → Claude compatibility**. Replace `web` with your profile name if you use another profile.

[npm package](https://www.npmjs.com/package/@guowenzhang/dsh-claude-compat)

## Notes

- Skills, memory, auto-memory, and rule loading are enabled by default; memory writing is disabled by default. No switch depends on another: memory writing does not require any loading switch to be enabled first.
- A switch change applies to the **next request**: turning loading off does not take back what this session already folded, and a batch this session already folded is not folded again after turning a switch back on (memory and auto memory are separate paths, so the same holds for each). Start a new session after changing them.
- Writing only adds: a topic file is never overwritten, and `MEMORY.md` refuses new entries once it reaches 200 lines or 25 KB.
- Project and user `.claude` resources are reused. Memories are written only when the model calls the tool; existing memories are not automatically organized, overwritten, or deleted. When using Claude Code alongside DSH, avoid editing the same file simultaneously.
- Memory does not update live when files change; start a new session after changes. Nested memory and rules with `paths` load only after matching files are read, not when they are written or edited.
- Claude Code's `settings.json` is not read. Configure options such as a custom memory directory in this plugin instead.
- Memory-file `@path` imports expand directly, without an additional approval prompt for files outside the working directory. Load only trusted projects.

## Not yet supported

This plugin does not currently support Claude Code **MCP or Hooks**.

Import MCP configuration through the separate [MCP manager plugin](https://github.com/zhang-guo-wen/dsh-mcp-manager). It supports both global and **Agent-level (Agent preset)** MCP management, with per-Agent configuration, on-demand loading, and tool filtering for greater flexibility.

## License

Apache License 2.0; see [LICENSE](<LICENSE>). Includes MIT-licensed portions derived from DeepSeek Harness; see [NOTICE](<NOTICE>). Not affiliated with or endorsed by Claude Code or its owners.
