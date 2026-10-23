import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as http from 'http';
import { createHmac } from 'crypto';
import { AddressInfo } from 'net';
import { ApprovalWebhookNotifier } from '../src/approval/ApprovalWebhookNotifier';

interface Hit {
    headers: http.IncomingHttpHeaders;
    body: string;
}

function startServer(): Promise<{ url: string; hits: Hit[]; close(): Promise<void> }> {
    const hits: Hit[] = [];
    const server = http.createServer((req, res) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            hits.push({ headers: req.headers, body });
            res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
        });
    });
    return new Promise(resolve => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address() as AddressInfo;
            resolve({
                url: `http://127.0.0.1:${port}/approval`,
                hits,
                close: () => new Promise<void>(done => server.close(() => done()))
            });
        });
    });
}

const sampleRequest = {
    id: 'ap-1',
    toolName: 'terminal',
    sessionId: 's1',
    reason: 'Tool "terminal" requires approval.',
    summary: 'Tool "terminal" requires approval. Summary: {"command":"ls"}',
    hasInput: true,
    inputSummary: '{"command":"ls"}',
    timeoutMs: 30000,
    expiresAt: Date.now() + 30000
};

@Suite('approval webhook')
export class ApprovalWebhookTest {

    @Test('posts the request with a signed body')
    async signedPayload() {
        const server = await startServer();
        try {
            const notifier = new ApprovalWebhookNotifier({
                approvalWebhook: { url: server.url, secret: 'shh', timeoutMs: 2000 }
            } as any);
            expect(await notifier.notify(sampleRequest)).toBe(true);
            expect(server.hits.length).toEqual(1);
            const hit = server.hits[0];
            const payload = JSON.parse(hit.body);
            expect(payload.type).toEqual('approval_requested');
            expect(payload.request.id).toEqual('ap-1');
            expect(payload.request.sessionId).toEqual('s1');
            expect(payload.request.inputSummary).toEqual('{"command":"ls"}');

            const timestamp = String(hit.headers['x-tsdi-timestamp']);
            const expected = createHmac('sha256', 'shh').update(`${timestamp}.${hit.body}`).digest('hex');
            expect(hit.headers['x-tsdi-signature']).toEqual(`sha256=${expected}`);
        } finally {
            await server.close();
        }
    }

    @Test('an approval event triggers delivery')
    async eventTriggersDelivery() {
        const server = await startServer();
        try {
            const notifier = new ApprovalWebhookNotifier({
                approvalWebhook: { url: server.url, timeoutMs: 2000 }
            } as any);
            notifier.onApprovalRequested({ request: sampleRequest } as any);
            const deadline = Date.now() + 3000;
            while (!server.hits.length && Date.now() < deadline) {
                await new Promise(resolve => setTimeout(resolve, 20));
            }
            expect(server.hits.length).toEqual(1);
            expect(JSON.parse(server.hits[0].body).request.toolName).toEqual('terminal');
        } finally {
            await server.close();
        }
    }

    @Test('a failing endpoint never throws')
    async failureIsSwallowed() {
        const notifier = new ApprovalWebhookNotifier({
            approvalWebhook: { url: 'http://127.0.0.1:1/unreachable', timeoutMs: 300 }
        } as any);
        expect(await notifier.notify(sampleRequest)).toBe(false);
    }

    @Test('env configuration is the fallback')
    async envFallback() {
        const previousUrl = process.env.TSDI_AGENT_APPROVAL_WEBHOOK;
        const previousSecret = process.env.TSDI_AGENT_APPROVAL_WEBHOOK_SECRET;
        process.env.TSDI_AGENT_APPROVAL_WEBHOOK = 'https://approvals.example/hook';
        process.env.TSDI_AGENT_APPROVAL_WEBHOOK_SECRET = 'env-shh';
        try {
            const notifier = new ApprovalWebhookNotifier(null);
            expect(notifier.resolveWebhook()).toEqual({
                url: 'https://approvals.example/hook',
                secret: 'env-shh',
                timeoutMs: undefined
            });
            // Config wins over env.
            const configured = new ApprovalWebhookNotifier({ approvalWebhook: { url: 'https://config/hook', timeoutMs: 100 } } as any);
            expect(configured.resolveWebhook()?.url).toEqual('https://config/hook');
            // Nothing configured: no delivery.
            expect(await configured.notify(sampleRequest)).toBe(false);
        } finally {
            if (previousUrl === undefined) delete process.env.TSDI_AGENT_APPROVAL_WEBHOOK;
            else process.env.TSDI_AGENT_APPROVAL_WEBHOOK = previousUrl;
            if (previousSecret === undefined) delete process.env.TSDI_AGENT_APPROVAL_WEBHOOK_SECRET;
            else process.env.TSDI_AGENT_APPROVAL_WEBHOOK_SECRET = previousSecret;
        }
    }
}
