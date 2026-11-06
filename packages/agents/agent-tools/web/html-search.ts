import * as parse5 from 'parse5';
import type { AgentToolsWebOptions, WebSearchAdapter, WebSearchResult } from '../src/options';

const DEFAULT_ENDPOINT = 'https://www.bing.com/search';
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 15000;
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export interface HtmlWebSearchAdapterOptions {
    fetch?: typeof fetch;
    timeoutMs?: number;
    endpoint?: string;
}

interface PartialResult {
    title?: string;
    url?: string;
    snippet?: string;
}

/**
 * Keyless HTML search adapter used when no `web.search` adapter is configured.
 *
 * It queries Bing's static HTML endpoint (no API key, no browser) and parses
 * the result blocks. `web.search` still wins when a host injects one.
 */
export class BingWebSearchAdapter implements WebSearchAdapter {
    constructor(private readonly options: HtmlWebSearchAdapterOptions = {}) {
    }

    async search(query: string, limit?: number, signal?: AbortSignal): Promise<WebSearchResult[]> {
        const fetcher = this.options.fetch ?? globalThis.fetch;
        if (!fetcher) {
            throw new Error('web_search requires a fetch implementation.');
        }
        const endpoint = this.options.endpoint ?? DEFAULT_ENDPOINT;
        const url = `${endpoint}?q=${encodeURIComponent(query)}&count=${clampLimit(limit)}`;
        const timeoutMs = this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
        const onAbort = () => controller.abort();
        if (signal?.aborted) {
            controller.abort();
        } else {
            signal?.addEventListener('abort', onAbort, { once: true });
        }
        try {
            const response = await fetcher(url, {
                headers: {
                    'user-agent': USER_AGENT,
                    accept: 'text/html,application/xhtml+xml',
                    'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8'
                },
                signal: controller.signal
            });
            if (!response.ok) {
                throw new Error(`web_search request failed with status ${response.status}.`);
            }
            const html = await response.text();
            return parseBingResults(html).slice(0, clampLimit(limit));
        } catch (error) {
            if (signal?.aborted) {
                throw error;
            }
            if (controller.signal.aborted) {
                throw new Error(`web_search timed out after ${timeoutMs}ms.`);
            }
            const message = error instanceof Error ? error.message : String(error);
            throw message.startsWith('web_search') ? error : new Error(`web_search failed: ${message}`);
        } finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', onAbort);
        }
    }
}

export function createDefaultWebSearchAdapter(web?: AgentToolsWebOptions): WebSearchAdapter {
    return new BingWebSearchAdapter({ fetch: web?.fetch, timeoutMs: web?.timeoutMs });
}

/** Extract ordered results from Bing's HTML result page. */
export function parseBingResults(html: string): WebSearchResult[] {
    const document = parse5.parse(String(html || '')) as any;
    const results: PartialResult[] = [];
    const walk = (node: any): void => {
        if (!node || typeof node !== 'object') {
            return;
        }
        if (Array.isArray(node)) {
            node.forEach(child => walk(child));
            return;
        }
        const tag = String(node.tagName || '').toLowerCase();
        if (isResultContainer(node)) {
            const entry = parseResultContainer(node);
            if (entry.title && entry.url) {
                results.push(entry);
            }
            return;
        }
        for (const child of node.childNodes || []) {
            walk(child);
        }
    };
    walk(document);
    return results.map(entry => ({
        title: entry.title || '',
        url: entry.url || '',
        snippet: entry.snippet || undefined
    }));
}

function isResultContainer(node: any): boolean {
    const tag = String(node.tagName || '').toLowerCase();
    if (tag !== 'li' && tag !== 'div') {
        return false;
    }
    const classes = classList(node);
    return classes.includes('b_algo') || classes.includes('b_algoSlug');
}

function parseResultContainer(node: any): PartialResult {
    const titleAnchor = resolveTitleAnchor(node);
    const captions = descendants(node, (child: any) => classList(child).includes('b_caption'));
    const paragraphs = captions.length
        ? descendants(captions[0], (child: any) => String(child.tagName || '').toLowerCase() === 'p' && !!normalizeText(child))
        : descendants(node, (child: any) => String(child.tagName || '').toLowerCase() === 'p' && !!normalizeText(child));
    return {
        title: titleAnchor ? normalizeText(titleAnchor) : '',
        url: titleAnchor ? normalizeResultUrl(attribute(titleAnchor, 'href')) : '',
        snippet: paragraphs.length
            ? normalizeText(paragraphs[0])
            : (captions.length ? normalizeText(captions[0]) : '')
    };
}

/**
 * Bing emits a site-icon anchor (`a.tilk`) before the real title anchor, so
 * prefer the heading link and only fall back to the first usable anchor.
 */
function resolveTitleAnchor(node: any): any | undefined {
    const headings = descendants(node, (child: any) => String(child.tagName || '').toLowerCase() === 'h2');
    if (headings.length) {
        const anchors = descendants(headings[0], (child: any) => isExternalAnchor(child));
        if (anchors.length) {
            return anchors[0];
        }
    }
    return descendants(node, (child: any) => isExternalAnchor(child)
        && !classList(child).includes('tilk'))[0];
}

function isExternalAnchor(child: any): boolean {
    if (String(child.tagName || '').toLowerCase() !== 'a') {
        return false;
    }
    const href = attribute(child, 'href');
    return !!href && !/^javascript:/i.test(href);
}

function descendants(node: any, predicate: (child: any) => boolean): any[] {
    const found: any[] = [];
    const visit = (current: any): void => {
        for (const child of current?.childNodes || []) {
            if (predicate(child)) {
                found.push(child);
            }
            visit(child);
        }
    };
    visit(node);
    return found;
}

function classList(node: any): string[] {
    return String(attribute(node, 'class') || '').split(/\s+/).filter(Boolean);
}

function attribute(node: any, name: string): string | undefined {
    const attrs = Array.isArray(node?.attrs) ? node.attrs : [];
    const found = attrs.find((item: any) => String(item?.name || '').toLowerCase() === name);
    return found ? String(found.value ?? '') : undefined;
}

function textOf(node: any): string {
    if (!node || typeof node !== 'object') {
        return '';
    }
    if (Array.isArray(node)) {
        return node.map(child => textOf(child)).join(' ');
    }
    if (typeof node.value === 'string') {
        return node.value;
    }
    return (node.childNodes || []).map((child: any) => textOf(child)).join(' ');
}

function normalizeText(node: any): string {
    return textOf(node).replace(/\s+/g, ' ').trim();
}

function normalizeResultUrl(href?: string): string {
    const raw = String(href || '').trim();
    if (!raw) {
        return '';
    }
    const absolute = raw.startsWith('//') ? `https:${raw}` : raw;
    try {
        const url = new URL(absolute);
        if (url.hostname.endsWith('bing.com') && url.pathname.startsWith('/ck/')) {
            const target = url.searchParams.get('u');
            if (target) {
                const decoded = decodeBingTarget(target);
                if (decoded) {
                    return decoded;
                }
            }
        }
        return url.toString();
    } catch {
        return raw;
    }
}

/** Bing wraps external links as `u=a1<base64url>`; decode that prefix. */
function decodeBingTarget(value: string): string {
    if (!value.startsWith('a1')) {
        return '';
    }
    const body = value.slice(2).replace(/-/g, '+').replace(/_/g, '/');
    const padded = body + '='.repeat((4 - (body.length % 4)) % 4);
    try {
        const binary = globalThis.atob(padded);
        const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
        return new TextDecoder().decode(bytes);
    } catch {
        return '';
    }
}

function clampLimit(limit?: number): number {
    if (typeof limit !== 'number' || !Number.isFinite(limit)) {
        return DEFAULT_LIMIT;
    }
    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(limit)));
}
