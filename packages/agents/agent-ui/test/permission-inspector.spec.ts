import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionState } from '../src';
import { explainAgentConsolePermission } from '../src/AgentConsolePermissionInspector';
import { runPermissionsCommand } from '../src/AgentConsolePolicyCommands';

@Suite('permission inspector')
export class PermissionInspectorTest {
    @Test('deny rules win over every permissive layer')
    denyWins() {
        expect(explainAgentConsolePermission('terminal.exec', {
            level: 'full',
            deny: ['terminal*']
        })).toEqual({ effect: 'deny', reason: 'deny-rule', pattern: 'terminal*' });
    }

    @Test('read-only profiles deny tools before the level applies')
    readOnly() {
        expect(explainAgentConsolePermission('write_file', { level: 'auto', readOnly: true }))
            .toEqual({ effect: 'deny', reason: 'read-only' });
    }

    @Test('an allow list restricts tools but admits matches')
    allowList() {
        expect(explainAgentConsolePermission('web_search', { level: 'auto', allow: ['read_file', 'grep*'] }))
            .toEqual({ effect: 'deny', reason: 'allow-list', pattern: 'read_file' });
        expect(explainAgentConsolePermission('grep_tree', { level: 'auto', allow: ['read_file', 'grep*'] }))
            .toEqual({ effect: 'allow', reason: 'level' });
    }

    @Test('security level maps to allow/ask/deny')
    levels() {
        expect(explainAgentConsolePermission('terminal', { level: 'read-only' }))
            .toEqual({ effect: 'deny', reason: 'level' });
        expect(explainAgentConsolePermission('terminal', { level: 'ask' }))
            .toEqual({ effect: 'ask', reason: 'default' });
        expect(explainAgentConsolePermission('terminal', { level: 'auto' }))
            .toEqual({ effect: 'allow', reason: 'level' });
        expect(explainAgentConsolePermission('terminal', { level: 'full' }))
            .toEqual({ effect: 'allow', reason: 'level' });
    }

    @Test('/permissions inspect explains the active profile decision')
    async inspectCommand() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.configure({ sessionId: 'session-1', workspace: '' });
        state.securityLevel = 'ask';
        state.activeArchetype = 'build';
        const overlays: Array<{ title: string; lines: string[] }> = [];
        const host: any = {
            translator: null,
            state: {
                ...state,
                openTextOverlay: (title: string, lines: string[]) => overlays.push({ title, lines })
            },
            options: {
                policy: {
                    approval: {
                        requireApproval: [
                            'shell.exec',
                            { category: 'sandbox', action: 'allow', resource: 'git status*' }
                        ]
                    }
                }
            },
            runtime: {
                getSessionArchetype: () => 'build',
                listAgentProfiles: () => [{
                    name: 'build',
                    mode: 'primary',
                    permissions: { deny: ['terminal*'] }
                }]
            },
            notify: () => undefined,
            rpcRequestContext: () => undefined,
            getSessionSandboxMode: async () => 'workspace-write'
        };
        await runPermissionsCommand(host, 'inspect terminal.exec');
        expect(overlays.length).toEqual(1);
        const text = overlays[0].lines.join('\n');
        expect(text).toContain('Decision for terminal.exec: DENY');
        expect(text).toContain('Ordered approval rules: 2');

        await runPermissionsCommand(host, 'inspect terminal git status --short');
        const allowText = overlays[1].lines.join('\n');
        expect(allowText).toContain('Approval rule: ALLOW');
        expect(allowText).toContain('#2');
        expect(overlays[0].title).toEqual('Permissions');
        const body = overlays[0].lines.join('\n');
        expect(body).toContain('Agent profile: build (primary)');
        expect(body).toContain('Security level: ');
        expect(body.toLowerCase()).toContain('ask');
        expect(body).toContain('Sandbox: workspace-write');
        expect(body).toContain('matched deny rule terminal*');
    }
}
