import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { AgentToolsOptions, defaultAgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);

@Injectable()
export class HttpRequestTool implements AgentTool {
    name = 'http_request';
    description = 'Send an HTTP(S) request with method, headers, and an optional body.';
    inputSchema = {
        type: 'object',
        properties: {
            url: { type: 'string' },
            method: { type: 'string' },
            headers: { type: 'object' },
            body: {}
        },
        required: ['url']
    };
    toolset = 'http';
    source = 'local';
    execution = { readOnly: false, sideEffect: true, requiresSequential: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const url = this.requireUrl(input?.url);
        const method = this.resolveMethod(input?.method);
        const headers = this.resolveHeaders(input?.headers);
        const body = this.resolveBody(input?.body, headers);
        const fetcher = this.options?.http?.fetch ?? this.options?.web?.fetch ?? globalThis.fetch;
        if (!fetcher) {
            throw new Error('http_request requires a fetch implementation.');
        }
        const timeoutMs = this.options?.http?.timeoutMs ?? defaultAgentToolsOptions.http?.timeoutMs ?? 15000;
        const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
        const response = await fetcher(url, {
            method,
            headers,
            body,
            signal: controller?.signal
        });
        if (timer) {
            clearTimeout(timer);
        }
        const maxChars = this.options?.http?.maxResponseChars ?? defaultAgentToolsOptions.http?.maxResponseChars ?? 12000;
        const text = await response.text();
        return {
            url,
            ok: !!response.ok,
            status: Number(response.status ?? 0),
            headers: this.readHeaders(response.headers),
            body: text.slice(0, maxChars),
            truncated: text.length > maxChars
        };
    }

    private requireUrl(value: unknown): string {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid http_request input: url must be a non-empty string.');
        }
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('Invalid http_request input: url must use http or https.');
        }
        return url.toString();
    }

    private resolveMethod(value: unknown): string {
        const method = typeof value === 'string' && value.trim() ? value.trim().toUpperCase() : 'GET';
        if (!ALLOWED_METHODS.has(method)) {
            throw new Error(`Invalid http_request input: method '${method}' is not supported.`);
        }
        return method;
    }

    private resolveHeaders(value: unknown): Record<string, string> {
        if (value == null) {
            return {};
        }
        if (typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('Invalid http_request input: headers must be an object.');
        }
        const headers: Record<string, string> = {};
        Object.keys(value as Record<string, unknown>).forEach(key => {
            const lower = key.toLowerCase();
            if (lower === 'host' || lower === 'content-length') {
                throw new Error(`Invalid http_request input: header '${key}' is not allowed.`);
            }
            const headerValue = (value as Record<string, unknown>)[key];
            headers[key] = String(headerValue);
        });
        return headers;
    }

    private resolveBody(body: unknown, headers: Record<string, string>): any {
        if (body == null) {
            return undefined;
        }
        if (typeof body === 'string') {
            return body;
        }
        const contentType = Object.keys(headers).find(key => key.toLowerCase() === 'content-type');
        if (!contentType) {
            headers['content-type'] = 'application/json';
        }
        return JSON.stringify(body);
    }

    private readHeaders(headers: any): Record<string, string> {
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
