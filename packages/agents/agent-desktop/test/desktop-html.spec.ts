import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { buildDesktopHtml, normalizeGatewayUrl } from '../src';

@Suite('Agent desktop host HTML')
export class AgentDesktopHtmlTest {
    @Test('normalizes gateway URLs and rejects unsupported protocols')
    gatewayUrl() {
        expect(normalizeGatewayUrl(' http://127.0.0.1:3000/// ')).toEqual('http://127.0.0.1:3000');
        expect(() => normalizeGatewayUrl('file:///tmp/socket')).toThrow();
        expect(() => normalizeGatewayUrl('')).toThrow();
    }

    @Test('renders nonce CSP and local bundle URI')
    htmlPolicy() {
        const html = buildDesktopHtml({
            scriptUri: 'file:///app/resources/agent-console.js',
            baseUrl: 'https://gateway.example/',
            nonce: 'nonce-1',
            title: 'TSDI Agent'
        });
        expect(html).toContain("default-src 'none'");
        expect(html).toContain("script-src 'nonce-nonce-1'");
        expect(html).toContain('src="file:///app/resources/agent-console.js"');
        expect(html).toContain('"baseUrl":"https://gateway.example"');
        expect(html).toContain('<title>TSDI Agent</title>');
    }

    @Test('escapes injected configuration before embedding it in script')
    escapedConfig() {
        const html = buildDesktopHtml({
            scriptUri: 'bundle.js',
            baseUrl: 'https://gateway.example',
            token: '</script><script>alert(1)</script>',
            nonce: 'nonce-2'
        });
        expect(html).not.toContain('</script><script>alert(1)</script>');
        expect(html).toContain('\\u003c/script\\u003e');
    }
    @Test('renders persistent desktop session tabs and numeric shortcuts')
    sessionTabs() {
        const html = buildDesktopHtml({
            scriptUri: 'bundle.js',
            baseUrl: 'https://gateway.example',
            sessionId: 'session-1',
            nonce: 'nonce-3'
        });
        expect(html).toContain('id="session-tabs"');
        expect(html).toContain('tsdi-agent-desktop-tabs-v1');
        expect(html).toContain("params.get('session')");
        expect(html).toContain('event.ctrlKey || event.metaKey');
        expect(html).toContain("add.textContent = '+'");
    }
}
