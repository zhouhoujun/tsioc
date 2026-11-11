import { Inject, token } from '@tsdi/ioc';
import { Controller, Post, RequestBody } from '@tsdi/service';

/**
 * MCP tool descriptor exposed by a microservice provider.
 */
export interface McpServerToolDescriptor {
    name: string;
    title?: string;
    description?: string;
    inputSchema?: Record<string, any>;
    outputSchema?: Record<string, any>;
    annotations?: Record<string, any>;
}

export interface McpServerToolCallResult {
    content?: Array<Record<string, any>>;
    structuredContent?: any;
    isError?: boolean;
    [key: string]: any;
}

export interface McpServerResourceDescriptor {
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
    size?: number;
}

export interface McpServerPromptDescriptor {
    name: string;
    description?: string;
    arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

/**
 * Back-end contract for MCP servers built on `@tsdi/mcp-microservice`.
 *
 * Implement this and declare `McpToolController` in the app root module to
 * expose any tool registry (agent tools, MCP clients, custom services) through
 * standard MCP JSON-RPC methods.
 */
export interface McpServerProvider {
    initialize?(params?: Record<string, any>): Promise<Record<string, any>>;
    listTools(params?: Record<string, any>): Promise<{ tools: McpServerToolDescriptor[]; nextCursor?: string }>;
    callTool(name: string, args?: Record<string, any>): Promise<McpServerToolCallResult>;
    listResources?(params?: Record<string, any>): Promise<{ resources: McpServerResourceDescriptor[]; nextCursor?: string }>;
    listPrompts?(params?: Record<string, any>): Promise<{ prompts: McpServerPromptDescriptor[]; nextCursor?: string }>;
}

export const MCP_SERVER_PROVIDER = token<McpServerProvider>('MCP_SERVER_PROVIDER');

const DEFAULT_PROTOCOL_VERSION = '2026-07-28';

/**
 * Standard MCP controller backed by an {@link McpServerProvider}.
 *
 * ```ts
 * @Module({
 *   imports: [LoggerModule],
 *   declarations: [McpToolController],
 *   providers: [
 *     provideService(useRouter(), useMcpTransport({ ... })),
 *     provideAgentMcpServerProvider()
 *   ]
 * })
 * ```
 */
@Controller('/')
export class McpToolController {
    constructor(@Inject(MCP_SERVER_PROVIDER) private provider: McpServerProvider) {
    }

    @Post('/initialize')
    initialize(@RequestBody() body: Record<string, any>): Promise<Record<string, any>> | Record<string, any> {
        if (this.provider.initialize) {
            return this.provider.initialize(body);
        }
        return {
            protocolVersion: DEFAULT_PROTOCOL_VERSION,
            capabilities: {
                tools: {}
            },
            serverInfo: {
                name: 'tsdi-mcp-service',
                version: '6.0.31'
            }
        };
    }

    @Post('/tools/list')
    listTools(@RequestBody() body: Record<string, any>): Promise<{ tools: McpServerToolDescriptor[]; nextCursor?: string }> {
        return this.provider.listTools(body);
    }

    @Post('/tools/call')
    callTool(@RequestBody() body: Record<string, any>): Promise<McpServerToolCallResult> {
        const name = body?.name;
        if (typeof name !== 'string' || !name.trim()) {
            throw new Error('Invalid tools/call request: name must be a non-empty string.');
        }
        return this.provider.callTool(name.trim(), body?.arguments);
    }

    @Post('/resources/list')
    listResources(@RequestBody() body: Record<string, any>): Promise<{ resources: McpServerResourceDescriptor[]; nextCursor?: string }> {
        if (this.provider.listResources) {
            return this.provider.listResources(body);
        }
        return Promise.resolve({ resources: [] });
    }

    @Post('/prompts/list')
    listPrompts(@RequestBody() body: Record<string, any>): Promise<{ prompts: McpServerPromptDescriptor[]; nextCursor?: string }> {
        if (this.provider.listPrompts) {
            return this.provider.listPrompts(body);
        }
        return Promise.resolve({ prompts: [] });
    }
}

/**
 * Minimal module that only contributes the standard MCP tool controller.
 * The host still needs `provideService(useRouter(), useMcpTransport(...))`.
 */
export const MCP_TOOL_CONTROLLER = McpToolController;
