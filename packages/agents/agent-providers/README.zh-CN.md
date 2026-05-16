# packaged @tsdi/agent-providers

这个目录用于发布 `npm` 包，源码位于
[主仓库](https://github.com/zhouhoujun/tsioc)。

`@tsdi/agent-providers` 提供 `@tsdi/agent` 的模型提供方适配器，各个提供方支持按子路径独立导入。

## 安装

```shell
npm install @tsdi/agent-providers
```

## 构建

```shell
npm run build
```

## 测试

```shell
npm test
npm run test:coverage
```

## 提供方入口

- `@tsdi/agent-providers/openai`
- `@tsdi/agent-providers/anthropic`
- `@tsdi/agent-providers/gemini`
- `@tsdi/agent-providers/deepseek`
- `@tsdi/agent-providers/openai-compatible`

## 主要导出

- `withAgentModelAdapter`
- 各子路径下对应提供方的 options、tokens 与 adapter 实现

## 说明

- 这个包按模块拆分，按需导入需要的 provider 即可。
- 提供方测试位于 `test/*.spec.ts`，按厂商分别组织。

## License

MIT © [Houjun](https://github.com/zhouhoujun/)