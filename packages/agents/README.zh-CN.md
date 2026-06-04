# @tsdi agents 子项目

这个目录汇总了从本 monorepo 发布的 `@tsdi/agent*` 系列子项目。

## 许可证说明

仓库根目录许可证可以与本目录下的子包不同。
对于 `packages/agents/*` 下的所有包，分发与使用应以**各子项目自己的 Apache-2.0 许可证声明**为准，具体以每个子包的 `package.json` 与 README 中的说明为依据。

当前包括：

- `@tsdi/agent`
- `@tsdi/agent-tools`
- `@tsdi/agent-gateway`
- `@tsdi/agent-channels`
- `@tsdi/agent-providers`
- `@tsdi/agent-cli`

## 维护建议

当你在 `packages/agents/` 下新增子项目时：

1. 在 `package.json` 中设置 `"license": "Apache-2.0"`
2. 在 README / 本地化 README 中显式写明 Apache 2.0
3. 保持本目录总览与实际发布包列表一致
