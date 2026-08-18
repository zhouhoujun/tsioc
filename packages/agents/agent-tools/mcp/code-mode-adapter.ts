import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { CodeExecutionAdapter } from '../code-execution';
import { McpAgentTool } from './types';

/**
 * Exposes the existing sandboxed code executor through the MCP tool contract.
 * This is opt-in: constructing the adapter does not register it globally.
 */
export function createMcpCodeModeAdapter(adapter: CodeExecutionAdapter): McpAgentTool & AgentTool {
    return new McpCodeModeAdapter(adapter);
}

export class McpCodeModeAdapter implements McpAgentTool, AgentTool {
    readonly name = 'code_execution';
    readonly canonicalName = 'execute_code';
    readonly description = 'Execute a code snippet through the configured sandboxed code executor.';
    readonly inputSchema = {
        type: 'object',
        properties: {
            language: { type: 'string', description: 'Language/runtime identifier.' },
            code: { type: 'string', description: 'Code to execute.' },
            timeoutMs: { type: 'number', description: 'Optional execution timeout.' }
        },
        required: ['language', 'code']
    };
    readonly toolset = 'mcp:code-mode';
    readonly source = 'mcp' as const;
    readonly execution = { requiresSequential: true, sideEffect: true };
    readonly activation = { kind: 'deferred' as const, scope: 'session' as const };
    readonly tags = ['mcp', 'code_execution'];
    readonly provenance = { origin: 'mcp' as const, providerId: '@tsdi/agent-tools/mcp-code-mode', sessionScoped: true as const };

    constructor(private readonly adapter: CodeExecutionAdapter) {}

    async invoke(input: any, context: AgentToolContext): Promise<any> {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('Invalid code_execution input: expected an object.');
        }
        if (typeof input.language !== 'string' || !input.language.trim()) {
            throw new Error('Invalid code_execution language: must be a non-empty string.');
        }
        if (typeof input.code !== 'string' || !input.code.trim()) {
            throw new Error('Invalid code_execution code: must be a non-empty string.');
        }
        const result = await this.adapter.execute({
            language: input.language.trim().toLowerCase(),
            code: input.code,
            timeoutMs: typeof input.timeoutMs === 'number' && input.timeoutMs > 0 ? input.timeoutMs : 30000,
            workspace: context.workspace
        });
        return {
            content: [{ type: 'text', text: result.stdout || result.stderr || '' }],
            structuredContent: { ...result },
            isError: result.exitCode !== 0 || !!result.error
        };
    }
}
