# 模型上下文协议（MCP）

MCP（Model Context Protocol）是一个开放标准，让 AI 应用通过统一接口连接外部工具与数据源。
它由 Anthropic 于 2024 年 11 月提出，常被比喻为"AI 世界的 USB-C"。

一个 MCP Server 把某项能力（文件系统、数据库、文档、搜索引擎等）以标准协议暴露出来，
任何支持 MCP 的客户端都能即插即用，无需为每个服务写定制集成代码。

在 LangChain.js 中，用 @langchain/mcp-adapters 的 MultiServerMCPClient 即可连接一个或多个 MCP 服务器，
拿到的工具可以直接喂给 createAgent()。
