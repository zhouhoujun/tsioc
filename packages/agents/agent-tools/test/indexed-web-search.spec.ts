import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { WebSearchTool, WebExtractTool } from '../web';
import { WebSearchResult } from '../src/options';

function adapter(results: WebSearchResult[]): { search: () => Promise<WebSearchResult[]> } {
    return { search: async () => results };
}

@Suite('Indexed web search (G30)')
export class IndexedWebSearchTest {
    @Test('filters search results to allowed domains in indexed mode')
    async filtersToAllowedDomains() {
        const tool = new WebSearchTool({ web: { indexed: true, allowedDomains: ['example.com'], search: adapter([
            { title: 'allowed', url: 'https://example.com/page' },
            { title: 'blocked', url: 'https://evil.com/x' },
            { title: 'subdomain', url: 'https://docs.example.com/deep' }
        ]) } } as any);
        const result = await tool.invoke({ query: 'test' }, {} as any);
        expect(result.indexed).toBe(true);
        expect(result.results.map((r: any) => r.url)).toEqual([
            'https://example.com/page',
            'https://docs.example.com/deep'
        ]);
    }

    @Test('keeps all results when indexed mode is off')
    async noIndexedModeKeepsAll() {
        const tool = new WebSearchTool({ web: { search: adapter([
            { title: 'a', url: 'https://example.com/x' },
            { title: 'b', url: 'https://other.io/y' }
        ]) } } as any);
        const result = await tool.invoke({ query: 'test' }, {} as any);
        expect(result.indexed).toBeUndefined();
        expect(result.results).toHaveLength(2);
    }

    @Test('indexed mode without allowlist falls back to unfiltered')
    async indexedWithoutAllowlist() {
        const tool = new WebSearchTool({ web: { indexed: true, search: adapter([
            { title: 'a', url: 'https://anywhere.com/x' }
        ]) } } as any);
        const result = await tool.invoke({ query: 'test' }, {} as any);
        expect(result.results).toHaveLength(1);
        expect(result.indexed).toBeUndefined();
    }

    @Test('rejects extraction outside allowlist in indexed mode')
    async rejectsExtractionOutsideAllowlist() {
        const tool = new WebExtractTool({ web: { indexed: true, allowedDomains: ['example.com'] } } as any);
        await expect(tool.invoke({ url: 'https://evil.com/x' }, {} as any))
            .rejects.toThrow(/outside the server-approved domain allowlist/);
    }

    @Test('allows extraction inside allowlist in indexed mode')
    async allowsExtractionInsideAllowlist() {
        let fetched = '';
        const tool = new WebExtractTool({ web: {
            indexed: true,
            allowedDomains: ['example.com'],
            fetch: async (url: string) => {
                fetched = url;
                return { ok: true, status: 200, text: async () => '<html><head><title>T</title></head><body><p>hello world</p></body></html>' };
            }
        } } as any);
        const result = await tool.invoke({ url: 'https://example.com/page' }, {} as any);
        expect(fetched).toBe('https://example.com/page');
        expect(result.content).toContain('hello world');
    }

    @Test('extraction without indexed mode has no domain gate')
    async noIndexedNoGate() {
        let fetched = '';
        const tool = new WebExtractTool({ web: {
            fetch: async (url: string) => {
                fetched = url;
                return { ok: true, status: 200, text: async () => '<html><body><p>plain</p></body></html>' };
            }
        } } as any);
        const result = await tool.invoke({ url: 'https://anything.com/x' }, {} as any);
        expect(fetched).toBe('https://anything.com/x');
        expect(result.content).toContain('plain');
    }

    @Test('does not let an allowlisted domain be spoofed via path, query, or look-alike host')
    async rejectsSpoofedAllowedDomain() {
        const tool = new WebExtractTool({ web: { indexed: true, allowedDomains: ['example.com'] } } as any);
        for (const url of [
            'https://evil.com/?ref=example.com',
            'https://example.com.evil.com/x',
            'https://notexample.com/x'
        ]) {
            await expect(tool.invoke({ url }, {} as any))
                .rejects.toThrow(/outside the server-approved domain allowlist/);
        }
    }

    @Test('filters search results whose URL only mentions an allowed domain')
    async filtersSpoofedDomainsInSearch() {
        const tool = new WebSearchTool({ web: { indexed: true, allowedDomains: ['example.com'], search: adapter([
            { title: 'legit', url: 'https://example.com/page' },
            { title: 'sub', url: 'https://docs.example.com/deep' },
            { title: 'query-bypass', url: 'https://evil.com/?u=example.com' },
            { title: 'lookalike', url: 'https://example.com.evil.com/x' }
        ]) } } as any);
        const result = await tool.invoke({ query: 'test' }, {} as any);
        expect(result.results.map((r: any) => r.url)).toEqual([
            'https://example.com/page',
            'https://docs.example.com/deep'
        ]);
    }

    @Test('flags an extraction that yields no readable text instead of a silent empty success')
    async flagsEmptyExtraction() {
        // Regression (real web run): a 2xx fetch of a JS-rendered page extracted to
        // `content: ''` with no signal, so the model retried the same/other URLs
        // blindly. Empty extraction must be marked actionable.
        const tool = new WebExtractTool({ web: {
            fetch: async () => ({ ok: true, status: 200, text: async () => '<html><head></head><body><div id="root"></div><!-- hydrate --></body></html>' })
        } } as any);
        const result = await tool.invoke({ url: 'https://app.example.com/x' }, {} as any);
        expect(result.content).toEqual('');
        expect(result.empty).toEqual(true);
        expect(String(result.warning)).toMatch(/readable text/i);
    }

    @Test('does not flag an extraction that produced readable text')
    async doesNotFlagNonEmptyExtraction() {
        const tool = new WebExtractTool({ web: {
            fetch: async () => ({ ok: true, status: 200, text: async () => '<html><body><p>hello world</p></body></html>' })
        } } as any);
        const result = await tool.invoke({ url: 'https://example.com/x' }, {} as any);
        expect(result.content).toContain('hello world');
        expect(result.empty).toBeUndefined();
        expect(result.warning).toBeUndefined();
    }
}
