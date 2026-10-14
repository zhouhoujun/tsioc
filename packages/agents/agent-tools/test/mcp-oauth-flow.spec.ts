import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import {
    AgentMcpServerOptions,
    ConsoleMcpOAuthInteraction,
    McpOAuthClient,
    McpOAuthCredentialStore,
    McpOAuthInteraction
} from '../mcp';

function startMockOAuth(): Promise<{ base: string; close: () => Promise<void> }> {
    return new Promise(resolve => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url || '/', 'http://127.0.0.1');
            const port = (server.address() as any).port;
            const base = `http://127.0.0.1:${port}`;
            if (url.pathname === '/.well-known/oauth-authorization-server') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ authorization_endpoint: `${base}/authorize`, token_endpoint: `${base}/token` }));
                return;
            }
            if (url.pathname === '/authorize') {
                const redirect = url.searchParams.get('redirect_uri') || '';
                const state = url.searchParams.get('state') || '';
                res.writeHead(302, { Location: `${redirect}?code=MOCK&state=${state}` });
                res.end();
                return;
            }
            if (url.pathname === '/token') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ access_token: 'at-mock', token_type: 'Bearer', expires_in: 3600 }));
                return;
            }
            res.writeHead(404);
            res.end();
        });
        server.listen(0, '127.0.0.1', () => {
            resolve({ base: `http://127.0.0.1:${(server.address() as any).port}`, close: () => new Promise(done => server.close(() => done())) });
        });
    });
}

class FakeInteraction implements McpOAuthInteraction {
    opened: string[] = [];
    async onDeviceAuthorization(): Promise<void> { /* not exercised */ }
    async openAuthorizationUrl(url: string): Promise<void> {
        this.opened.push(url);
        // Arrive immediately — before the client registers its waitForCode — to
        // prove the loopback listener buffers an early authorization callback
        // instead of dropping it (which used to make the flow time out).
        await fetch(url, { redirect: 'follow' });
    }
}

@Suite('MCP OAuth PKCE flow')
export class McpOAuthFlowTest {
    @Test('authorizeAndStore persists the token under the configured credentialsPath')
    async persistsTokenUnderCredentialsPath() {
        const mock = await startMockOAuth();
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-oauth-'));
        const credentialsPath = path.join(dir, 'mcp-credentials.json');
        try {
            const interaction = new FakeInteraction();
            const client = new McpOAuthClient(
                { credentialsPath, oauthCallbackPort: 0 } as any,
                { interaction, timeoutMs: 10000 }
            );
            const server = {
                id: 'web',
                url: `${mock.base}/mcp`,
                auth: { type: 'oauth', clientId: 'c1' }
            } as AgentMcpServerOptions;

            const ok = await client.authorizeAndStore(server);

            expect(ok).toEqual(true);
            expect(interaction.opened.length).toEqual(1);
            expect(fs.existsSync(credentialsPath)).toEqual(true);
            expect(new McpOAuthCredentialStore(credentialsPath).get('web')?.token.accessToken).toEqual('at-mock');
        } finally {
            await mock.close();
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('openAuthorizationUrl does not crash when the browser launcher is missing')
    async missingLauncherDoesNotCrash() {
        const interaction = new ConsoleMcpOAuthInteraction();
        const originalPath = process.env.PATH;
        const originalWrite = process.stdout.write;
        const writes: string[] = [];
        (process.stdout as any).write = (chunk: any) => { writes.push(String(chunk)); return true; };
        try {
            process.env.PATH = '';
            await interaction.openAuthorizationUrl('http://127.0.0.1:9/authorize');
            await new Promise(resolve => setTimeout(resolve, 300));
        } finally {
            process.env.PATH = originalPath;
            (process.stdout as any).write = originalWrite;
        }
        expect(writes.join('')).toContain('Could not open a browser automatically');
    }
}
