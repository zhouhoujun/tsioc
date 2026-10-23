import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator } from '@tsdi/core';
import { ApprovalDecision, DefaultApprovalStrategy, ToolApprovalManager } from '@tsdi/agent';
import { startApprovalRemoteServer } from '../src/approval/ApprovalRemoteServer';

function buildManager() {
    const app = { publishEvent: async () => undefined } as any;
    return new ToolApprovalManager(
        app,
        new RandomUuidGenerator(),
        new DefaultApprovalStrategy(['shell.exec']),
        { defaultTimeoutMs: 500 }
    );
}

@Suite('TUI approval HTTP endpoint')
export class ApprovalRemoteServerTest {

    @Test('refuses to start without an owner or approver token')
    async requiresToken() {
        const manager = buildManager();
        let thrown: any = null;
        try {
            await startApprovalRemoteServer({ manager, port: 0 });
        } catch (error) {
            thrown = error;
        }
        expect(String(thrown?.message)).toContain('--gateway-token');
    }

    @Test('an approver lists and approves through the loopback endpoint')
    async approverFlow() {
        const manager = buildManager();
        const server = await startApprovalRemoteServer({
            manager,
            port: 0,
            approvers: [{ id: 'ci', token: 'ci-secret' }]
        });
        try {
            const pending = manager.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
            const base = `http://${server.host}:${server.port}`;
            const health = await fetch(`${base}/health`);
            expect(health.status).toBe(200);

            const headers = { authorization: 'Bearer ci-secret' };
            const listed = await (await fetch(`${base}/api/approvals`, { headers })).json() as any;
            expect(listed.requests?.length).toEqual(1);

            const approved = await (await fetch(`${base}/api/approvals/${listed.requests[0].id}/approve`, {
                method: 'POST',
                headers
            })).json() as any;
            expect(approved.applied).toBe(true);
            expect((await pending).decision).toEqual(ApprovalDecision.APPROVED);

            expect((await fetch(`${base}/nope`, { headers })).status).toBe(404);
        } finally {
            await server.close();
        }
    }

    @Test('the operator token works as an approver even for ownerless sessions')
    async operatorTokenApproves() {
        const manager = buildManager();
        // Ownership checks would reject an unknown principal; the endpoint token
        // is the operator's, so it acts as an approver.
        const owners = { isAuthorized: async () => false, listOwned: async () => [] } as any;
        const server = await startApprovalRemoteServer({ manager, owners, port: 0, authToken: 'owner-secret' });
        try {
            const pending = manager.checkApproval('shell.exec', { cmd: 'ls' }, 's1');
            const base = `http://${server.host}:${server.port}`;
            const headers = { authorization: 'Bearer owner-secret' };
            const listed = await (await fetch(`${base}/api/approvals`, { headers })).json() as any;
            expect(listed.requests?.length).toEqual(1);
            const approved = await (await fetch(`${base}/api/approvals/${listed.requests[0].id}/approve`, {
                method: 'POST',
                headers
            })).json() as any;
            expect(approved.applied).toBe(true);
            expect((await pending).decision).toEqual(ApprovalDecision.APPROVED);
        } finally {
            manager.cancelBySession('s1');
            await server.close();
        }
    }
}
