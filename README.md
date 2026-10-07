# dsh-claude-compat

English | [中文](<README.zh.md>)

## Background

Many projects already maintain skills, rules, and memory around Claude Code. This plugin makes those existing projects compatible with DeepSeek Harness by reusing their resources and optionally writing new memories. You can use DSH alongside Claude Code while maintaining just one set of resources, without separate migration or duplication.

## Screenshot

**Settings → Claude compatibility**: enable skill loading, memory loading, memory writing, and rule loading as needed.

![Claude compatibility settings](<docs/images/claude-compat-settings.png>)

## Install from npm

```sh
npx @deepseek-ai/dsh plugin --profile web add @guowenzhang/dsh-claude-compat
```

Restart DSH after installation, then open **Settings → Claude compatibility**. Replace `web` with your profile name if you use another profile.

[npm package](https://www.npmjs.com/package/@guowenzhang/dsh-claude-compat)

## Notes

- Skills, memory, and rule loading are enabled by default. Memory writing is disabled by default and requires memory loading to be enabled first.
- Project and user `.claude` resources are reused. Memories are written only when the model calls the tool; existing memories are not automatically organized, overwritten, or deleted. When using Claude Code alongside DSH, avoid editing the same file simultaneously.
- Memory does not update live when files change; start a new session after changes. Nested memory and rules with `paths` load only after matching files are read, not when they are written or edited.
- Claude Code's `settings.json` is not read. Configure options such as a custom memory directory in this plugin instead.
- Memory-file `@path` imports expand directly, without an additional approval prompt for files outside the working directory. Load only trusted projects.

## Not yet supported

This plugin does not currently support Claude Code **MCP or Hooks**.

Import MCP configuration through the separate [MCP manager plugin](https://github.com/zhang-guo-wen/dsh-mcp-manager). It supports both global and **Agent-level (Agent preset)** MCP management, with per-Agent configuration, on-demand loading, and tool filtering for greater flexibility.

## License

Apache License 2.0; see [LICENSE](<LICENSE>). Includes MIT-licensed portions derived from DeepSeek Harness; see [NOTICE](<NOTICE>). Not affiliated with or endorsed by Claude Code or its owners.
