覆盖什么、何时读：MCP 管理为什么拆成独立仓、拆分后两边各自的设置命名空间与设置页区块、以及依赖边界。被问及「MCP 功能在哪 / 那个设置项为什么没了」，或要动设置命名空间时读我。

# MCP 管理已拆分

MCP 服务器管理(行的增删改、加载模式、工具过滤、「MCP 管理」设置页区块)是**独立的插件仓**
`@guowenzhang/dsh-mcp-manager`(`../dsh-mcp-manager`)。本仓不再包含任何 MCP 代码,也不注册 Typert Remote。

两边的关系:

- **设置命名空间分开**:`context-injection`(本仓:`skills` / `memory` / `memoryWrite` / `rules`)与
  `mcp-manager`(那边:`loading` / `descriptions` / `tools`)。settings 服务一个命名空间只有一个 registrant,
  共用做不到,所以拆分时把 MCP 三项搬到了新命名空间并去掉了 `mcp` 前缀。
- **设置页两个独立区块**:本仓 order 13「Claude 兼容」,那边 order 14「MCP 管理」。
- 本仓 client 半边**不 mount 任何 Remote**,只注册字典与设置区块,不需要 `remote` / `workspaces`。
- 两边互不 import、互不依赖,可以单独安装与卸载。

MCP 的维护知识(MCP 行编写、延迟加载、预加载闸门、工具过滤、工具选择 UI、JSON 兼容)全部搬到了那边的
`AGENTS.md`。
