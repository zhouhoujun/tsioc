import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { buildAgentWebviewHtml, normalizeGatewayUrl } from '../src';

@Suite('Agent VS Code webview HTML')
export class AgentWebviewHtmlTest {
    @Test('normalizes gateway URLs and rejects unsupported protocols')
    gatewayUrl() {
        expect(normalizeGatewayUrl(' http://127.0.0.1:3000/// ')).toEqual('http://127.0.0.1:3000');
        expect(() => normalizeGatewayUrl('file:///tmp/socket')).toThrow();
        expect(() => normalizeGatewayUrl('')).toThrow();
    }

    @Test('renders nonce CSP and local bundle URI')
    htmlPolicy() {
        const html = buildAgentWebviewHtml({
            cspSource: 'vscode-webview:',
            scriptUri: 'vscode-resource:/media/agent-console.js',
            baseUrl: 'https://gateway.example/',
            nonce: 'nonce-1'
        });
        expect(html).toContain("default-src 'none'");
        expect(html).toContain("script-src 'nonce-nonce-1'");
        expect(html).toContain('src="vscode-resource:/media/agent-console.js"');
        expect(html).toContain('"baseUrl":"https://gateway.example"');
    }

    @Test('escapes injected configuration before embedding it in script')
    escapedConfig() {
        const html = buildAgentWebviewHtml({
            cspSource: 'vscode-webview:',
            scriptUri: 'bundle.js',
            baseUrl: 'https://gateway.example',
            token: '</script><script>alert(1)</script>',
            nonce: 'nonce-2'
        });
        expect(html).not.toContain('</script><script>alert(1)</script>');
        expect(html).toContain('\\u003c/script\\u003e');
    }
}
