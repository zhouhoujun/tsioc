import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions, defaultAgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';

@Injectable()
export class HttpFetchTool implements AgentTool {
    name = 'http_fetch';
    description = 'Fetch a URL over HTTP(S) and return the response body.';
    inputSchema = {
        type: 'object',
        properties: {
            url: { type: 'string' }
        },
        required: ['url']
    };
    toolset = 'http';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const url = this.requireUrl(input?.url);
        const response = await this.fetch(url, { method: 'GET' });
        return this.toResult(url, response);
    }

    protected async fetch(url: string, init?: any): Promise<any> {
        const fetcher = this.options?.http?.fetch ?? this.options?.web?.fetch ?? globalThis.fetch;
        if (!fetcher) {
            throw new Error('http_fetch requires a fetch implementation.');
        }
        const timeoutMs = this.options?.http?.timeoutMs ?? defaultAgentToolsOptions.http?.timeoutMs ?? 15000;
        const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
        try {
            return await fetcher(url, {
                ...(init ?? {}),
                signal: controller?.signal
            });
        } finally {
            if (timer) {
                clearTimeout(timer);
            }
        }
    }

    protected async toResult(url: string, response: any): Promise<any> {
        const maxChars = this.options?.http?.maxResponseChars ?? defaultAgentToolsOptions.http?.maxResponseChars ?? 12000;
        const text = await response.text();
        const truncated = text.length > maxChars;
        return {
            url,
            ok: !!response.ok,
            status: Number(response.status ?? 0),
            headers: this.readHeaders(response.headers),
            body: text.slice(0, maxChars),
            truncated
        };
    }

    protected requireUrl(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid http_fetch input: url must be a non-empty string.');
        }
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('Invalid http_fetch input: url must use http or https.');
        }
        return url.toString();
    }

    protected readHeaders(headers: any): Record<string, string> {
        const values: Record<string, string> = {};
        if (!headers || typeof headers.forEach !== 'function') {
            return values;
        }
        headers.forEach((value: string, key: string) => {
            values[key] = value;
        });
        return values;
    }
}
