import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { isSandboxDenial, requestSandboxEscalation } from '../src/harness/sandbox-escalation';
import { ApprovalDecision } from '../src/tools/ToolApprovalManager';

@Suite('sandbox escalation')
export class SandboxEscalationTest {
    @Test('recognises sandbox denials but not ordinary tool failures')
    denialDetection() {
        expect(isSandboxDenial(new Error('EROFS: read-only file system'))).toEqual(true);
        expect(isSandboxDenial(new Error('EACCES: permission denied'))).toEqual(true);
        expect(isSandboxDenial(new Error('bwrap: Can\'t chdir'))).toEqual(true);
        expect(isSandboxDenial(new Error('sandbox proxy enforcement rejected execution'))).toEqual(true);
        expect(isSandboxDenial(new Error('assertion failed: expected 1'))).toEqual(false);
        expect(isSandboxDenial(undefined)).toEqual(false);
    }

    @Test('asks for a one-shot escalation and only proceeds when approved')
    async approvalFlow() {
        const calls: any[] = [];
        const approved = {
            checkApproval: async (...args: any[]) => {
                calls.push(args);
                return { decision: ApprovalDecision.APPROVED };
            }
        } as any;
        expect(await requestSandboxEscalation(approved, 'terminal', { command: 'x' }, 's1', new Error('EROFS'))).toEqual(true);
        // force=true: escalation is not part of the ordinary approval policy.
        expect(calls[0][3]).toEqual(true);

        const denied = { checkApproval: async () => ({ decision: ApprovalDecision.DENIED }) } as any;
        expect(await requestSandboxEscalation(denied, 'terminal', {}, 's1', new Error('EROFS'))).toEqual(false);
        // Non-sandbox failures never prompt.
        expect(await requestSandboxEscalation(denied, 'terminal', {}, 's1', new Error('boom'))).toEqual(false);
    }
}
