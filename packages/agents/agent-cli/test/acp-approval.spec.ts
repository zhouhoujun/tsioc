import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ApprovalDecision } from '@tsdi/agent';
import { AcpApprovalManager } from '../src/acp-approval';

@Suite('ACP approval bridge')
export class AcpApprovalTest {
    @Test('maps client allow/reject to approval decisions')
    async mapsDecisions() {
        const manager = new AcpApprovalManager();
        manager.attach({
            requestPermission: async () => ({ outcome: 'allow' })
        } as any);
        expect((await manager.checkApproval('terminal', {}, 's1', true)).decision).toEqual(ApprovalDecision.APPROVED);

        manager.attach({
            requestPermission: async () => ({ outcome: 'reject' })
        } as any);
        expect((await manager.checkApproval('terminal', {}, 's1', true)).decision).toEqual(ApprovalDecision.DENIED);
    }

    @Test('denies when no ACP client is attached')
    async unattached() {
        const manager = new AcpApprovalManager();
        expect(manager.isConfigured()).toEqual(false);
        expect((await manager.checkApproval('terminal', {}, 's1')).decision).toEqual(ApprovalDecision.DENIED);
    }
}
