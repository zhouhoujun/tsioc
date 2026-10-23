import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as http from 'http';
import { AddressInfo } from 'net';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
    decideRemoteApproval,
    formatApprovalLine,
    resolveApprovalTimeoutMs,
    runAgentApprovalDecision,
    runAgentApprovalList
} from '../src/approval-command';
import { runAgentConsole } from '../src/run-console';

interface Recorded {
    method: string;
    url: string;
    authorization?: string;
}

function startGateway(denyDecisions = false): Promise<{ url: string; calls: Recorded[]; close(): Promise<void> }> {
    const calls: Recorded[] = [];
    const server = http.createServer((req, res) => {
        calls.push({
            method: String(req.method),
            url: String(req.url),
            authorization: req.headers.authorization as string | undefined
        });
        res.setHeader('content-type', 'application/json');
        if (req.method === 'GET' && req.url?.startsWith('/api/approvals')) {
            res.writeHead(200).end(JSON.stringify({
                requests: [{
                    id: 'approval-1234567890',
                    toolName: 'terminal',
                    sessionId: 'chat-1',
                    reason: 'Tool "terminal" requires approval.',
                    inputSummary: '{"command":"ls"}',
                    expiresAt: Date.now() + 30_000
                }]
            }));
            return;
        }
        const decision = req.url?.match(/^\/api\/approvals\/([^/]+)\/(approve|reject)$/);
        if (req.method === 'POST' && decision && denyDecisions) {
            res.writeHead(403).end(JSON.stringify({ error: 'forbidden' }));
            return;
        }
        if (req.method === 'POST' && decision) {
            res.writeHead(200).end(JSON.stringify({
                requestId: decodeURIComponent(decision[1]),
                sessionId: 'chat-1',
                applied: true,
                decision: decision[2] === 'approve' ? 'approved' : 'denied'
            }));
            return;
        }
        res.writeHead(403).end(JSON.stringify({ error: 'forbidden' }));
    });
    return new Promise(resolve => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address() as AddressInfo;
            resolve({
                url: `http://127.0.0.1:${port}`,
                calls,
                close: () => new Promise<void>(done => server.close(() => done()))
            });
        });
    });
}

function startHangingGateway(): Promise<{ url: string; close(): Promise<void> }> {
    const sockets = new Set<import('net').Socket>();
    const server = http.createServer(() => {
        // Accept the request but never answer: the CLI must give up on its own.
    });
    server.on('connection', socket => {
        sockets.add(socket);
        socket.on('close', () => sockets.delete(socket));
    });
    return new Promise(resolve => {
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address() as AddressInfo;
            resolve({
                url: `http://127.0.0.1:${port}`,
                close: () => new Promise<void>(done => {
                    sockets.forEach(socket => socket.destroy());
                    server.close(() => done());
                })
            });
        });
    });
}

@Suite('approval CLI')
export class ApprovalCommandTest {

    @Test('list prints pending approvals and forwards the token/session filter')
    async listApprovals() {
        const gateway = await startGateway();
        try {
            const output: string[] = [];
            const requests = await runAgentApprovalList({
                gatewayUrl: gateway.url,
                token: 'approver-secret',
                sessionId: 'chat-1',
                write: text => { output.push(text); }
            });
            expect(requests.map(request => request.id)).toEqual(['approval-1234567890']);
            expect(output.join('')).toContain('terminal');
            expect(output.join('')).toContain('session=chat-1');
            expect(gateway.calls[0].url).toEqual('/api/approvals?sessionId=chat-1');
            expect(gateway.calls[0].authorization).toEqual('Bearer approver-secret');
        } finally {
            await gateway.close();
        }
    }

    @Test('--json prints the raw payload')
    async listJson() {
        const gateway = await startGateway();
        try {
            const output: string[] = [];
            await runAgentApprovalList({ gatewayUrl: gateway.url, json: true, write: text => { output.push(text); } });
            const parsed = JSON.parse(output.join(''));
            expect(parsed.requests[0].toolName).toEqual('terminal');
        } finally {
            await gateway.close();
        }
    }

    @Test('approve/reject post to the decision endpoint and report the outcome')
    async decisions() {
        const gateway = await startGateway();
        try {
            const approved: string[] = [];
            const approve = await runAgentApprovalDecision('approve', 'approval-1234567890', {
                gatewayUrl: gateway.url,
                token: 'approver-secret',
                write: text => { approved.push(text); }
            });
            expect(approve.applied).toBe(true);
            expect(approved.join('')).toContain('Approved approval-1234567890');
            expect(gateway.calls[0].method).toEqual('POST');
            expect(gateway.calls[0].url).toEqual('/api/approvals/approval-1234567890/approve');

            const rejected: string[] = [];
            const reject = await runAgentApprovalDecision('reject', 'approval-1234567890', {
                gatewayUrl: gateway.url,
                write: text => { rejected.push(text); }
            });
            expect(reject.decision).toEqual('denied');
            expect(rejected.join('')).toContain('Rejected approval-1234567890');
        } finally {
            await gateway.close();
        }
    }

    @Test('chat --gateway-port without a token fails before starting the TUI')
    async gatewayPortRequiresToken() {
        const previousApprovers = process.env.TSDI_AGENT_APPROVER_TOKENS;
        delete process.env.TSDI_AGENT_APPROVER_TOKENS;
        const root = mkdtempSync(join(tmpdir(), 'tsdi-chat-gateway-'));
        try {
            let thrown: any = null;
            try {
                await runAgentConsole({ root, workspace: root, gatewayPort: '43210' } as any);
            } catch (error) {
                thrown = error;
            }
            expect(String(thrown?.message)).toContain('--gateway-token');
        } finally {
            if (previousApprovers !== undefined) {
                process.env.TSDI_AGENT_APPROVER_TOKENS = previousApprovers;
            }
            rmSync(root, { recursive: true, force: true });
        }
    }

    @Test('a missing gateway URL fails with an actionable message')
    async missingGateway() {
        const previous = process.env.TSDI_AGENT_GATEWAY_URL;
        delete process.env.TSDI_AGENT_GATEWAY_URL;
        try {
            let thrown: any = null;
            try {
                await decideRemoteApproval('approve', 'x');
            } catch (error) {
                thrown = error;
            }
            expect(String(thrown?.message)).toContain('--gateway-url');
        } finally {
            if (previous !== undefined) {
                process.env.TSDI_AGENT_GATEWAY_URL = previous;
            }
        }
    }

    @Test('non-2xx responses surface the gateway error')
    async errorResponse() {
        const gateway = await startGateway(true);
        try {
            let thrown: any = null;
            try {
                await decideRemoteApproval('approve', 'approval-1234567890', { gatewayUrl: gateway.url });
            } catch (error) {
                thrown = error;
            }
            expect(String(thrown?.message)).toContain('forbidden');
        } finally {
            await gateway.close();
        }
    }

    @Test('a silent endpoint times out with an actionable message')
    async timesOut() {
        const gateway = await startHangingGateway();
        try {
            let thrown: any = null;
            try {
                await runAgentApprovalList({ gatewayUrl: gateway.url, timeoutMs: 100 });
            } catch (error) {
                thrown = error;
            }
            expect(String(thrown?.message)).toContain('timed out after 100ms');
            expect(String(thrown?.message)).toContain(gateway.url);
            expect(String(thrown?.message)).toContain('still running');
        } finally {
            await gateway.close();
        }
    }

    @Test('an unreachable gateway names the address instead of "fetch failed"')
    async unreachable() {
        const gateway = await startGateway();
        const url = gateway.url;
        await gateway.close();
        let thrown: any = null;
        try {
            await decideRemoteApproval('approve', 'approval-1234567890', { gatewayUrl: url });
        } catch (error) {
            thrown = error;
        }
        expect(String(thrown?.message)).toContain(`Cannot reach the approval gateway at ${url}`);
        expect(String(thrown?.message)).toContain('--gateway-url');
    }

    @Test('timeout falls back to 15s unless the flag or env overrides it')
    async timeoutResolution() {
        const previous = process.env.TSDI_AGENT_APPROVAL_TIMEOUT_MS;
        try {
            delete process.env.TSDI_AGENT_APPROVAL_TIMEOUT_MS;
            expect(resolveApprovalTimeoutMs()).toEqual(15_000);
            expect(resolveApprovalTimeoutMs({ timeoutMs: '2500' })).toEqual(2_500);
            process.env.TSDI_AGENT_APPROVAL_TIMEOUT_MS = '7000';
            expect(resolveApprovalTimeoutMs()).toEqual(7_000);
            expect(resolveApprovalTimeoutMs({ timeoutMs: 300 })).toEqual(300);
            // Commander passes the flag as `timeout`.
            expect(resolveApprovalTimeoutMs({ timeout: '1800' })).toEqual(1_800);
        } finally {
            if (previous === undefined) {
                delete process.env.TSDI_AGENT_APPROVAL_TIMEOUT_MS;
            } else {
                process.env.TSDI_AGENT_APPROVAL_TIMEOUT_MS = previous;
            }
        }
    }

    @Test('formatApprovalLine keeps the id, tool, session and expiry')
    async formatting() {
        const line = formatApprovalLine({
            id: 'approval-1234567890',
            toolName: 'terminal',
            sessionId: 'chat-1',
            inputSummary: '{"command":"ls"}',
            expiresAt: Date.now() + 25_000
        }, Date.now());
        expect(line).toContain('approval-123');
        expect(line).toContain('terminal');
        expect(line).toContain('session=chat-1');
        expect(line).toContain('expires in');
    }
}
