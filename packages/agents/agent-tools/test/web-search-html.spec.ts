import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { WebSearchTool } from '../web/web-search.tool';
import { parseBingResults } from '../web/html-search';

const REDIRECT_URL = 'https://www.bing.com/ck/a?!&&p=abc&u=a1aHR0cHM6Ly9ub2RlanMub3JnL2VuL2Rvd25sb2Fk&ntb=1';

const RESULT_HTML = `<!DOCTYPE html>
<html><body><ol id="b_results">
    <li class="b_algo">
        <a class="tilk" aria-label="nodejs.org" href="https://www.bing.com/"><div class="cico">icon</div></a>
        <h2><a href="${REDIRECT_URL}">Node.js Downloads</a></h2>
        <div class="b_caption"><p class="b_lineclamp2">Download the latest <strong>Node.js</strong> release.</p></div>
    </li>
    <li class="b_algo">
        <h2><a href="https://example.com/b">Example <strong>B</strong></a></h2>
        <p>Second snippet.</p>
    </li>
    <li class="b_algo">
        <h2><a href="https://example.com/c">Example C</a></h2>
    </li>
</ol></body></html>`;

@Suite('Web search (keyless HTML adapter)')
export class WebSearchHtmlTest {

    @Test('parses titles, snippets and unwraps redirect urls')
    parsesResults() {
        const results = parseBingResults(RESULT_HTML);
        expect(results.length).toEqual(3);
        expect(results[0].title).toEqual('Node.js Downloads');
        expect(results[0].url).toEqual('https://nodejs.org/en/download');
        expect(results[0].snippet).toEqual('Download the latest Node.js release.');
        expect(results[1].title).toEqual('Example B');
        expect(results[1].url).toEqual('https://example.com/b');
        expect(results[2].snippet).toBeUndefined();
    }

    @Test('searches with the built-in adapter when none is configured')
    async searchesWithoutConfiguredAdapter() {
        let requested = '';
        let headers: Record<string, string> = {};
        const tool = new WebSearchTool({
            web: {
                timeoutMs: 5000,
                fetch: (async (input: any, init: any) => {
                    requested = String(input);
                    headers = init?.headers || {};
                    return { ok: true, status: 200, text: async () => RESULT_HTML };
                }) as any
            }
        });
        const result = await tool.invoke({ query: 'node 22', limit: 2 }, {} as any);
        expect(requested).toContain('bing.com/search');
        expect(requested).toContain('q=node%2022');
        expect(requested).toContain('count=2');
        expect(String(headers['user-agent'] || '')).toContain('Mozilla');
        expect(result.query).toEqual('node 22');
        expect(result.results).toHaveLength(2);
        expect(result.results[0].url).toEqual('https://nodejs.org/en/download');
    }

    @Test('a configured adapter still overrides the built-in one')
    async configuredAdapterWins() {
        const tool = new WebSearchTool({
            web: {
                fetch: (async () => { throw new Error('built-in adapter must not run'); }) as any,
                search: { search: async () => [{ title: 'custom', url: 'https://example.com/custom' }] }
            }
        });
        const result = await tool.invoke({ query: 'x' }, {} as any);
        expect(result.results).toEqual([{ title: 'custom', url: 'https://example.com/custom' }]);
    }

    @Test('reports http failures with the status code')
    async reportsHttpFailure() {
        const tool = new WebSearchTool({
            web: { fetch: (async () => ({ ok: false, status: 503, text: async () => '' })) as any }
        });
        let message = '';
        try {
            await tool.invoke({ query: 'x' }, {} as any);
        } catch (error: any) {
            message = String(error?.message || error);
        }
        expect(message).toContain('503');
    }

    @Test('times out with an actionable message')
    async timesOut() {
        const tool = new WebSearchTool({
            web: {
                timeoutMs: 5,
                fetch: ((_: any, init: any) => new Promise((_, reject) => {
                    init.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
                })) as any
            }
        });
        let message = '';
        try {
            await tool.invoke({ query: 'x' }, {} as any);
        } catch (error: any) {
            message = String(error?.message || error);
        }
        expect(message).toContain('timed out');
    }
}
