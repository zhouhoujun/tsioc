import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import {
    AGENT_CONSOLE_SECURITY_LEVELS,
    applySecurityLevel,
    normalizeSecurityLevel,
    runPermissionsCommand
} from '../src/AgentConsolePolicyCommands';
import { AgentConsoleSettingsStore } from '../src/AgentConsoleSettingsStore';
import { TestFileAdapter } from './_helpers';

function createHost(overrides: any = {}) {
    const calls: any = { plan: [], yolo: [], sandbox: [], persisted: [], notices: [] };
    const state: any = {
        sessionId: 'session-1',
        planMode: false,
        yoloMode: false,
        securityLevel: '',
        ...(overrides.state || {})
    };
    const host: any = {
        state,
        options: {},
        runtime: {},
        translator: null,
        notify: (message: string) => calls.notices.push(message),
        rpcRequestContext: () => ({}),
        getSessionDelegationMode: async () => 'default',
        getSessionSandboxMode: async () => 'default',
        setSessionSandboxMode: async (sessionId: string, mode: string | null) => { calls.sandbox.push([sessionId, mode]); },
        runPlanCommand: async (args: string) => { calls.plan.push(args); state.planMode = args === 'on'; },
        setYoloMode: async (enabled: boolean) => { calls.yolo.push(enabled); state.yoloMode = enabled; },
        persistSettings: async (patch: Record<string, any>) => { calls.persisted.push(patch); },
        select: async () => undefined,
        ...overrides.host
    };
    if (overrides.select !== undefined) {
        host.select = overrides.select;
    }
    return { host, calls, state };
}

@Suite('permissions security levels (codex parity)')
export class SecurityLevelTest {
    @Test('normalizes codex-permission names and aliases')
    aliases() {
        expect(AGENT_CONSOLE_SECURITY_LEVELS).toEqual(['read-only', 'ask', 'auto', 'full']);
        expect(normalizeSecurityLevel('read-only')).toEqual('read-only');
        expect(normalizeSecurityLevel('readonly')).toEqual('read-only');
        expect(normalizeSecurityLevel('ask-for-approval')).toEqual('ask');
        expect(normalizeSecurityLevel('approve-for-me')).toEqual('auto');
        expect(normalizeSecurityLevel('full-access')).toEqual('full');
        expect(normalizeSecurityLevel('bogus')).toEqual(undefined);
        expect(normalizeSecurityLevel('')).toEqual(undefined);
    }

    @Test('Read Only enables plan mode and keeps approvals off')
    async readOnly() {
        const { host, calls, state } = createHost();
        await applySecurityLevel(host, 'read-only');
        expect(state.securityLevel).toEqual('read-only');
        expect(calls.plan).toEqual(['on']);
        expect(calls.yolo).toEqual([false]);
        expect(calls.sandbox).toEqual([['session-1', null]]);
        expect(calls.persisted).toEqual([{ securityLevel: 'read-only' }]);
        expect(calls.notices[0]).toContain('Read Only');
    }

    @Test('Ask for approval disables plan mode and auto-approve')
    async ask() {
        const { host, calls, state } = createHost({ state: { planMode: true } });
        await applySecurityLevel(host, 'ask');
        expect(state.securityLevel).toEqual('ask');
        expect(calls.plan).toEqual(['off']);
        expect(calls.yolo).toEqual([false]);
        expect(calls.sandbox).toEqual([['session-1', null]]);
    }

    @Test('Approve for me auto-approves while the sandbox stays at its default')
    async auto() {
        const { host, calls, state } = createHost();
        await applySecurityLevel(host, 'auto');
        expect(state.securityLevel).toEqual('auto');
        expect(calls.plan).toEqual([]);
        expect(calls.yolo).toEqual([true]);
        expect(calls.sandbox).toEqual([['session-1', null]]);
    }

    @Test('Full Access drops the sandbox as well')
    async full() {
        const { host, calls, state } = createHost();
        await applySecurityLevel(host, 'full');
        expect(state.securityLevel).toEqual('full');
        expect(calls.yolo).toEqual([true]);
        expect(calls.sandbox).toEqual([['session-1', 'off']]);
    }

    @Test('startup restore skips the sandbox, persistence and notice')
    async startupRestore() {
        const { host, calls, state } = createHost();
        await applySecurityLevel(host, 'full', { sandbox: false, persist: false, notify: false });
        expect(state.securityLevel).toEqual('full');
        expect(calls.yolo).toEqual([true]);
        expect(calls.sandbox).toEqual([]);
        expect(calls.persisted).toEqual([]);
        expect(calls.notices).toEqual([]);
    }

    @Test('/permissions level sets a level and rejects unknown ones with usage')
    async levelCommand() {
        const { host, calls } = createHost();
        await runPermissionsCommand(host, 'level auto');
        expect(calls.yolo).toEqual([true]);
        expect(calls.persisted).toEqual([{ securityLevel: 'auto' }]);

        const invalid = createHost();
        await runPermissionsCommand(invalid.host, 'level nope');
        expect(invalid.calls.plan).toEqual([]);
        expect(invalid.calls.persisted).toEqual([]);
        expect(invalid.calls.notices[0]).toContain('Usage: /permissions level');
    }

    @Test('/permissions level opens the picker and applies the selection')
    async levelPicker() {
        let opened: any;
        const { host, calls } = createHost({
            select: async (title: string, options: any[]) => {
                opened = { title, options };
                return 'read-only';
            }
        });
        await runPermissionsCommand(host, 'level');
        expect(opened.options.map((option: any) => option.value)).toEqual(['read-only', 'ask', 'auto', 'full']);
        expect(opened.options[0].label).toContain('Read Only');
        expect(calls.plan).toEqual(['on']);
        expect(calls.persisted).toEqual([{ securityLevel: 'read-only' }]);
    }

    @Test('settings store persists and validates the level')
    async storeRoundTrip() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-ui-level-'));
        try {
            const store = new AgentConsoleSettingsStore(new TestFileAdapter());
            await store.save(workspace, { securityLevel: 'full' });
            const file = path.join(workspace, '.tsdi-agent', 'settings.json');
            expect(JSON.parse(fs.readFileSync(file, 'utf8')).securityLevel).toEqual('full');
            expect((await store.load(workspace)).securityLevel).toEqual('full');

            fs.writeFileSync(file, JSON.stringify({ securityLevel: 'bogus' }));
            expect((await store.load(workspace)).securityLevel).toEqual(undefined);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
