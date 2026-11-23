import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { runPermissionsCommand } from '../src/AgentConsolePolicyCommands';

function buildHost(initial = false) {
    const options: any = { policy: { approval: { readOnlyShell: initial } } };
    const persisted: Array<Record<string, any>> = [];
    const rpc: Array<{ method: string; params: any }> = [];
    const notices: string[] = [];
    const host: any = {
        translator: null,
        state: { sessionId: 'session-1', workspace: '/work/app' },
        options,
        runtime: {},
        appRpc: {
            request: async (method: string, params: any) => {
                rpc.push({ method, params });
                return { ok: true };
            }
        },
        notify: (message: string) => notices.push(message),
        rpcRequestContext: () => ({}),
        getSessionDelegationMode: async () => 'default',
        getSessionSandboxMode: async () => 'default',
        setSessionSandboxMode: async () => undefined,
        runPlanCommand: async () => undefined,
        persistSettings: async (patch: Record<string, any>) => { persisted.push(patch); }
    };
    return { host, options, persisted, rpc, notices };
}

@Suite('/permissions scanner command')
export class PermissionsScannerCommandTest {
    @Test('reports the current state')
    async state() {
        const fixture = buildHost(true);
        await runPermissionsCommand(fixture.host, 'scanner');
        expect(fixture.notices[0]).toContain('on');
        const off = buildHost(false);
        await runPermissionsCommand(off.host, 'scanner');
        expect(off.notices[0]).toContain('off');
    }

    @Test('enables the read-only scanner live and persists it')
    async enable() {
        const fixture = buildHost(false);
        await runPermissionsCommand(fixture.host, 'scanner on');
        expect(fixture.options.policy.approval.readOnlyShell).toEqual(true);
        expect(fixture.persisted).toEqual([{ readOnlyShell: true }]);
        expect(fixture.rpc).toEqual([{ method: 'settings.ui.set', params: { readOnlyShell: true } }]);
        expect(fixture.notices[0]).toContain('on');
    }

    @Test('disables the scanner and persists it')
    async disable() {
        const fixture = buildHost(true);
        await runPermissionsCommand(fixture.host, 'scanner off');
        expect(fixture.options.policy.approval.readOnlyShell).toEqual(false);
        expect(fixture.persisted).toEqual([{ readOnlyShell: false }]);
        expect(fixture.notices[0]).toContain('off');
    }
}
