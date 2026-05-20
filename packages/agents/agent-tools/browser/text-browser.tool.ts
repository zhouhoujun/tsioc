import { AgentTool, AgentToolContext } from '@tsdi/agent';
import { Inject, Injectable, Optional } from '@tsdi/ioc';
import { lookup } from 'dns/promises';
import type { IncomingHttpHeaders, IncomingMessage } from 'http';
import { request as httpRequest } from 'http';
import { request as httpsRequest } from 'https';
import { isIP } from 'net';
import * as parse5 from 'parse5';
import { AgentToolsOptions, defaultAgentToolsOptions } from '../src/options';
import { AGENT_TOOLS_OPTIONS } from '../src/tokens';

const DEFAULT_TEXT_BROWSER_RESPONSE_BYTES = 256 * 1024;

interface ResolvedAddress {
    address: string;
    family: number;
}

interface TextBrowserFetchResult {
    body: string;
    headers: Record<string, string>;
    ok: boolean;
    status: number;
    truncated: boolean;
}

@Injectable()
export class TextBrowserTool implements AgentTool {
    name = 'text_browser';
    description = 'Fetch a web page and return readable text for lightweight browsing.';
    inputSchema = {
        type: 'object',
        properties: {
            url: { type: 'string' }
        },
        required: ['url']
    };
    toolset = 'browser';
    source = 'local';
    execution = { readOnly: true };

    constructor(
        @Optional() @Inject(AGENT_TOOLS_OPTIONS, { defaultValue: null })
        private options?: AgentToolsOptions
    ) {
    }

    async invoke(input: any, _context: AgentToolContext): Promise<any> {
        const url = this.requireUrl(input?.url);
        const response = await this.fetchPage(url, this.resolveResponseByteLimit());
        const text = extractText(response.body);
        const maxChars = this.resolveMaxContentChars();
        const content = text.slice(0, maxChars);
        return {
            url: url.toString(),
            ok: response.ok,
            status: response.status,
            headers: response.headers,
            title: extractTitle(response.body),
            content,
            truncated: response.truncated || text.length > maxChars
        };
    }

    protected async fetchPage(url: URL, maxBytes: number): Promise<TextBrowserFetchResult> {
        const resolved = await this.resolveAddress(url.hostname);
        const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
        const timeoutMs = this.options?.web?.timeoutMs ?? defaultAgentToolsOptions.web?.timeoutMs ?? 15000;
        return new Promise<TextBrowserFetchResult>((resolve, reject) => {
            const request = transport({
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port || undefined,
                path: `${url.pathname}${url.search}`,
                method: 'GET',
                headers: {
                    accept: 'text/html, text/plain;q=0.9, */*;q=0.1'
                },
                lookup(_hostname, _options, callback) {
                    callback(null, resolved.address, resolved.family);
                },
                servername: url.hostname
            }, (response) => {
                this.readResponse(response, maxBytes).then(resolve, reject);
            });
            request.on('error', reject);
            request.setTimeout(timeoutMs, () => {
                request.destroy(new Error(`text_browser request timed out after ${timeoutMs}ms.`));
            });
            request.end();
        });
    }

    private async resolveAddress(hostname: string): Promise<ResolvedAddress> {
        const normalized = hostname.trim().toLowerCase();
        if (!normalized) {
            throw new Error('Invalid text_browser input: url hostname is required.');
        }
        if (this.isBlockedHostname(normalized)) {
            throw new Error(`text_browser blocked internal host '${normalized}'.`);
        }
        const literalFamily = isIP(normalized);
        if (literalFamily) {
            if (this.isBlockedAddress(normalized, literalFamily)) {
                throw new Error(`text_browser blocked internal host '${normalized}'.`);
            }
            return { address: normalized, family: literalFamily };
        }
        const addresses = await lookup(normalized, { all: true, verbatim: true });
        if (!addresses.length) {
            throw new Error(`text_browser could not resolve host '${normalized}'.`);
        }
        if (addresses.some(entry => this.isBlockedAddress(entry.address, entry.family))) {
            throw new Error(`text_browser blocked internal host '${normalized}'.`);
        }
        return {
            address: addresses[0].address,
            family: addresses[0].family
        };
    }

    private async readResponse(response: IncomingMessage, maxBytes: number): Promise<TextBrowserFetchResult> {
        const headers = this.readHeaders(response.headers);
        const contentLength = Number(headers['content-length'] ?? '');
        if (Number.isFinite(contentLength) && contentLength > maxBytes) {
            response.destroy();
            throw new Error(`text_browser response exceeded ${maxBytes} bytes.`);
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        let truncated = false;
        return new Promise<TextBrowserFetchResult>((resolve, reject) => {
            let settled = false;
            const finish = () => {
                if (settled) {
                    return;
                }
                settled = true;
                resolve({
                    body: Buffer.concat(chunks, bytes).toString('utf8'),
                    headers,
                    ok: (response.statusCode ?? 0) >= 200 && (response.statusCode ?? 0) < 300,
                    status: response.statusCode ?? 0,
                    truncated
                });
            };
            const fail = (error: unknown) => {
                if (settled) {
                    return;
                }
                settled = true;
                reject(error instanceof Error ? error : new Error(String(error)));
            };
            response.on('data', (chunk: Buffer | string) => {
                if (settled) {
                    return;
                }
                const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                const remaining = maxBytes - bytes;
                if (remaining <= 0) {
                    truncated = true;
                    response.destroy();
                    return;
                }
                if (buffer.length > remaining) {
                    chunks.push(buffer.subarray(0, remaining));
                    bytes += remaining;
                    truncated = true;
                    response.destroy();
                    return;
                }
                chunks.push(buffer);
                bytes += buffer.length;
            });
            response.on('end', finish);
            response.on('close', () => {
                if (truncated) {
                    finish();
                }
            });
            response.on('error', (error) => {
                if (truncated) {
                    finish();
                    return;
                }
                fail(error);
            });
        });
    }

    private requireUrl(value: unknown): URL {
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error('Invalid text_browser input: url must be a non-empty string.');
        }
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            throw new Error('Invalid text_browser input: url must use http or https.');
        }
        return url;
    }

    private resolveMaxContentChars(): number {
        return this.options?.web?.maxContentChars ?? defaultAgentToolsOptions.web?.maxContentChars ?? 12000;
    }

    private resolveResponseByteLimit(): number {
        const maxChars = this.resolveMaxContentChars();
        return Math.max(DEFAULT_TEXT_BROWSER_RESPONSE_BYTES, maxChars * 8);
    }

    private isBlockedHostname(hostname: string): boolean {
        return hostname === 'localhost' || hostname.endsWith('.localhost');
    }

    private isBlockedAddress(address: string, family: number): boolean {
        if (family === 4) {
            return isBlockedIpv4(address);
        }
        if (family === 6) {
            return isBlockedIpv6(address);
        }
        return true;
    }

    private readHeaders(headers: IncomingHttpHeaders): Record<string, string> {
        return Object.entries(headers).reduce((values, [key, value]) => {
            if (Array.isArray(value)) {
                values[key] = value.join(', ');
                return values;
            }
            if (typeof value === 'string') {
                values[key] = value;
            }
            return values;
        }, {} as Record<string, string>);
    }
}

function isBlockedIpv4(address: string): boolean {
    const parts = address.split('.').map(part => Number(part));
    if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
        return true;
    }
    const [first, second, third] = parts;
    if (first === 0 || first === 10 || first === 127) {
        return true;
    }
    if (first === 100 && second >= 64 && second <= 127) {
        return true;
    }
    if (first === 169 && second === 254) {
        return true;
    }
    if (first === 172 && second >= 16 && second <= 31) {
        return true;
    }
    if (first === 192 && (second === 168 || (second === 0 && (third === 0 || third === 2)))) {
        return true;
    }
    if (first === 198 && ((second >= 18 && second <= 19) || (second === 51 && third === 100))) {
        return true;
    }
    if (first === 203 && second === 0 && third === 113) {
        return true;
    }
    if (first >= 224) {
        return true;
    }
    return false;
}

function isBlockedIpv6(address: string): boolean {
    const normalized = address.trim().toLowerCase();
    if (normalized.startsWith('::ffff:')) {
        const mapped = normalized.slice('::ffff:'.length);
        return mapped.includes('.') ? isBlockedIpv4(mapped) : true;
    }
    if (normalized === '::' || normalized === '::1') {
        return true;
    }
    if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('ff')) {
        return true;
    }
    return normalized.startsWith('fe8')
        || normalized.startsWith('fe9')
        || normalized.startsWith('fea')
        || normalized.startsWith('feb');
}

function extractTitle(html: string): string | undefined {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return match ? match[1].trim() : undefined;
}

function extractText(html: string): string {
    const document = parse5.parse(html) as parse5.DefaultTreeAdapterTypes.Document;
    const chunks: string[] = [];
    collectText(document, chunks, false);
    return chunks.join(' ').replace(/\s+/g, ' ').trim();
}

function collectText(node: parse5.DefaultTreeAdapterTypes.Node, chunks: string[], skip: boolean): void {
    const element = node as parse5.DefaultTreeAdapterTypes.Element | parse5.DefaultTreeAdapterTypes.Document | parse5.DefaultTreeAdapterTypes.DocumentFragment | parse5.DefaultTreeAdapterTypes.Template;
    const textNode = node as parse5.DefaultTreeAdapterTypes.TextNode;
    const nodeName = typeof (element as { nodeName?: unknown }).nodeName === 'string'
        ? ((element as { nodeName: string }).nodeName.toLowerCase())
        : '';
    const shouldSkip = skip || nodeName === 'head' || nodeName === 'script' || nodeName === 'style' || nodeName === 'noscript' || nodeName === '#comment';
    if (!shouldSkip && nodeName === '#text' && typeof textNode.value === 'string') {
        const value = textNode.value.trim();
        if (value) {
            chunks.push(value);
        }
    }
    if ('childNodes' in element && Array.isArray(element.childNodes)) {
        element.childNodes.forEach((child: parse5.DefaultTreeAdapterTypes.ChildNode) => collectText(child, chunks, shouldSkip));
    }
}
