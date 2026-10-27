import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ApprovalDecision } from '@tsdi/agent';
import { invokeToolWithWorkspaceTrust } from '../src/app-rpc/tool-invoke';

function createHost(overrides: any = {}) {
    const calls: Array<{ name: string; workspace?: string }> = [];
    const host: any = {
        tools: {
            getToolDefinition: () => ({ name: 'terminal', toolset: 'terminal', execution: { sideEffect: true } }),
            invoke: async (name: string, _input: any, _sessionId: string, _principalId?: string, workspace?: string) => {
                calls.push({ name, workspace });
                return { stdout: 'ok' };
            }
        },
        approvalManager: { checkApproval: async () => ({ decision: ApprovalDecision.DENIED }) },
        workspaceTrust: { isTrusted: () => false },
        ensureSessionAccess: async () => undefined,
        requireSessionId: () => 's1',
        requireString: (value: any) => String(value),
        ...overrides
    };
    return { host, calls };
}

@Suite('tools.invoke respects workspace trust for explicit workspaces')
export class ToolInvokeTrustTest {

    @Test('a mutating tool against an untrusted explicit workspace is refused')
    async refusesUntrustedWorkspace() {
        const { host, calls } = createHost();
        await expect(invokeToolWithWorkspaceTrust(host, {
            sessionId: 's1', name: 'terminal', input: { command: 'touch x' }, workspace: '/tmp/untrusted'
        }, { principalId: 'u1' } as any)).rejects.toThrow(/not trusted/);
        expect(calls).toEqual([]);
    }

    @Test('approving the trust prompt lets the invocation through')
    async allowsAfterApproval() {
        const { host, calls } = createHost({
            approvalManager: { checkApproval: async () => ({ decision: ApprovalDecision.APPROVED }) },
            workspaceTrust: { isTrusted: () => false, trust: () => undefined }
        });
        const result: any = await invokeToolWithWorkspaceTrust(host, {
            sessionId: 's1', name: 'terminal', input: { command: 'pwd' }, workspace: '/tmp/untrusted'
        }, { principalId: 'u1' } as any);
        expect(calls).toEqual([{ name: 'terminal', workspace: '/tmp/untrusted' }]);
        expect(result.output).toEqual({ stdout: 'ok' });
    }

    @Test('trusted workspaces and read-only tools skip the prompt')
    async skipsWhenSafe() {
        const trusted = createHost({ workspaceTrust: { isTrusted: () => true } });
        await invokeToolWithWorkspaceTrust(trusted.host, {
            sessionId: 's1', name: 'terminal', workspace: '/tmp/trusted'
        }, { principalId: 'u1' } as any);
        expect(trusted.calls.length).toEqual(1);

        const readOnlyCalls: Array<{ name: string; workspace?: string }> = [];
        const readOnly = createHost({
            tools: {
                getToolDefinition: () => ({ name: 'read_file' }),
                invoke: async (name: string, _input: any, _sessionId: string, _principalId?: string, workspace?: string) => {
                    readOnlyCalls.push({ name, workspace });
                    return { ok: true };
                }
            }
        });
        await invokeToolWithWorkspaceTrust(readOnly.host, {
            sessionId: 's1', name: 'read_file', workspace: '/tmp/untrusted'
        }, { principalId: 'u1' } as any);
        expect(readOnlyCalls.length).toEqual(1);
    }
}
