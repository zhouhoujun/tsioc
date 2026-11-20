import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleApprovalsPanelComponent } from '../src/AgentConsoleApprovalPanel';
import { runPermissionsCommand } from '../src/AgentConsolePolicyCommands';
import { readProjectApprovalAllowRules, saveProjectApprovalAllowRules } from '../src/AgentConsoleApprovalAllowRules';
import { restoreSettings } from '../src/AgentConsoleSettingsRuntime';
import { sanitizeApprovalAllowRules } from '../src/AgentConsoleSettingsStore';
import { AgentConsoleSessionState } from '../src/AgentConsoleSessionState';

function buildHost(rules: string[] = []) {
    let allowRules = [...rules];
    const overlays: Array<{ title: string; lines: string[] }> = [];
    const persisted: Array<Record<string, any>> = [];
    const notices: string[] = [];
    const host: any = {
        translator: null,
        state: {
            openTextOverlay: (title: string, lines: string[]) => overlays.push({ title, lines })
        },
        options: {},
        runtime: {},
        approvalManager: {
            getAllowRules: () => [...allowRules],
            setAllowRules: (next: string[]) => { allowRules = [...next]; }
        },
        notify: (message: string) => notices.push(message),
        rpcRequestContext: () => ({}),
        getSessionDelegationMode: async () => 'default',
        getSessionSandboxMode: async () => 'default',
        setSessionSandboxMode: async () => undefined,
        runPlanCommand: async () => undefined,
        persistSettings: async (patch: Record<string, any>) => { persisted.push(patch); }
    };
    return {
        host,
        overlays,
        persisted,
        notices,
        rules: () => [...allowRules]
    };
}

@Suite('project approval allow rules')
export class ApprovalAllowRulesTest {
    @Test('sanitize trims, deduplicates and bounds persisted rules')
    sanitize() {
        expect(sanitizeApprovalAllowRules(undefined)).toEqual(undefined);
        expect(sanitizeApprovalAllowRules('terminal')).toEqual(undefined);
        expect(sanitizeApprovalAllowRules([' terminal ', 'terminal', '', 5, 'write_file']))
            .toEqual(['terminal', 'write_file']);
        const many = Array.from({ length: 60 }, (_v, index) => `tool-${index}`);
        expect(sanitizeApprovalAllowRules(many)!.length).toEqual(50);
        expect(sanitizeApprovalAllowRules(many)![49]).toEqual('tool-59');
    }

    @Test('/permissions allow lists the active project rules')
    async listsRules() {
        const fixture = buildHost(['terminal', 'write_file']);
        await runPermissionsCommand(fixture.host, 'allow');
        expect(fixture.overlays.length).toEqual(1);
        expect(fixture.overlays[0].lines).toEqual(['terminal', 'write_file']);
    }

    @Test('/permissions allow reports an empty list')
    async listsEmpty() {
        const fixture = buildHost();
        await runPermissionsCommand(fixture.host, 'allow');
        expect(fixture.overlays[0].lines).toEqual(['No project-scoped allow rules.']);
    }

    @Test('/permissions allow <tool> appends and persists the rule')
    async addsRule() {
        const fixture = buildHost(['terminal']);
        await runPermissionsCommand(fixture.host, 'allow write_file');
        expect(fixture.rules()).toEqual(['terminal', 'write_file']);
        expect(fixture.persisted).toEqual([{ approvalAllowRules: ['terminal', 'write_file'] }]);
    }

    @Test('/permissions allow clear empties and persists the list')
    async clearsRules() {
        const fixture = buildHost(['terminal', 'write_file']);
        await runPermissionsCommand(fixture.host, 'allow clear');
        expect(fixture.rules()).toEqual([]);
        expect(fixture.persisted).toEqual([{ approvalAllowRules: [] }]);
    }

    @Test('the approval panel project action targets the selected request')
    async panelAction() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        const resolved: string[] = [];
        state.approvalAllowProjectAction = async (requestId: string) => { resolved.push(requestId); };
        state.pendingApprovals = [{
            id: 'approval-1',
            toolName: 'terminal',
            sessionId: 'session-1',
            reason: '',
            summary: '',
            hasInput: false,
            createdAt: 1,
            timeoutMs: 30000,
            expiresAt: 2
        }];
        state.selectedApprovalId = 'approval-1';
        const panel = new AgentConsoleApprovalsPanelComponent(state);
        await panel.approveProjectSelected();
        expect(resolved).toEqual(['approval-1']);
    }

    @Test('`p` maps to the project action only inside the approval prompt')
    async projectKey() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        expect(state.focusLayers.resolveShortcutKey('p')).toEqual('p');
        state.setApprovalsFocused(true);
        expect(state.focusLayers.resolveShortcutKey('p')).toEqual('approve-project');
        const resolved: string[] = [];
        state.approvalAllowProjectAction = async (requestId: string) => { resolved.push(requestId); };
        state.pendingApprovals = [{
            id: 'approval-2',
            toolName: 'terminal',
            sessionId: 'session-1',
            reason: '',
            summary: '',
            hasInput: false,
            createdAt: 1,
            timeoutMs: 30000,
            expiresAt: 2
        }];
        state.selectedApprovalId = 'approval-2';
        expect(await state.focusLayers.handleApprovalKey('approve-project', undefined as any)).toEqual(true);
        expect(resolved).toEqual(['approval-2']);
    }

    @Test('hosts without a local manager fall back to the persisted rules')
    async persistedFallback() {
        const host: any = {
            state: { workspace: '/work/app' },
            settingsStore: {
                load: async () => ({ approvalAllowRules: ['terminal', 'write_file'] })
            }
        };
        expect(await readProjectApprovalAllowRules(host)).toEqual(['terminal', 'write_file']);
        const persisted: Array<Record<string, any>> = [];
        host.persistSettings = async (patch: Record<string, any>) => { persisted.push(patch); };
        expect(await saveProjectApprovalAllowRules(host, ['terminal', 'terminal', 'write_file']))
            .toEqual(['terminal', 'write_file']);
        expect(persisted).toEqual([{ approvalAllowRules: ['terminal', 'write_file'] }]);
    }

    @Test('restoring settings re-applies the persisted rules')
    async restoreAppliesRules() {
        const applied: string[][] = [];
        const self: any = {
            settingsStore: {
                load: async () => ({ approvalAllowRules: ['terminal', 'write_file'] })
            },
            resolveHistoryWorkspace: () => '/work/app',
            resolvedApprovalManager: {
                setAllowRules: (rules: string[]) => { applied.push([...rules]); }
            },
            translator: null,
            state: {},
            options: { model: { explicitModel: true } },
            updateTerminalTitle: () => undefined
        };
        await restoreSettings(self);
        expect(applied).toEqual([['terminal', 'write_file']]);
    }
}
