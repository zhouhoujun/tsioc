import { AgentToolDefinition } from '../tools/AgentTool';

/**
 * Tools whose output crosses a trust boundary: web pages, HTTP responses,
 * browser page content and MCP servers are written by third parties and must
 * never be treated as instructions. Local filesystem/memory/session tools stay
 * trusted because the user asked the agent to inspect them.
 */
const UNTRUSTED_TOOLSETS = new Set(['web', 'http', 'browser', 'capture']);

const UNTRUSTED_TOOL_NAMES = new Set([
    'web_search',
    'web_extract',
    'http_fetch',
    'http_request',
    'browser_open',
    'skills_remote',
    'plugins',
    'ai_cli'
]);

export type TrustBoundaryToolDefinition = Pick<AgentToolDefinition, 'name' | 'toolset' | 'provenance'>;

/**
 * Whether a tool result must be fenced as untrusted external data. MCP is
 * always external regardless of the tool name chosen by the server.
 */
export function isUntrustedToolOutput(definition?: TrustBoundaryToolDefinition | null): boolean {
    if (!definition) {
        return false;
    }
    if (definition.provenance?.origin === 'mcp') {
        return true;
    }
    if (definition.toolset && UNTRUSTED_TOOLSETS.has(definition.toolset)) {
        return true;
    }
    const name = String(definition.name || '').trim();
    if (!name) {
        return false;
    }
    return UNTRUSTED_TOOL_NAMES.has(name)
        || name.startsWith('mcp.')
        || name.startsWith('browser_');
}

/** Fence an external tool result, leaving local tool output untouched. */
export function fenceToolOutputIfUntrusted(
    definition: TrustBoundaryToolDefinition | undefined,
    toolName: string,
    content: string
): string {
    return definition && isUntrustedToolOutput(definition)
        ? fenceUntrustedToolOutput(toolName, content)
        : content;
}

/**
 * Wrap untrusted output in a stable tag pair so the model can distinguish data
 * from instructions. Occurrences of the closing tag inside the payload are
 * neutralised so external content cannot terminate the fence early.
 */
export function fenceUntrustedToolOutput(toolName: string, content: string): string {
    const payload = String(content ?? '').replace(
        /<\s*\/?\s*untrusted-tool-output[^>]*>/gi,
        match => match.replace('<', '&lt;')
    );
    const name = String(toolName || 'tool').replace(/[^\w.:-]/g, '');
    return `<untrusted-tool-output tool="${name}">\n${payload}\n</untrusted-tool-output>`;
}
