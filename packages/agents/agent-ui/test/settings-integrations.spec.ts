import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { activateAgentConsoleMcpTool, manageAgentConsolePlugins } from '../src/AgentConsoleSettingsIntegrationActions';
import { describeAgentConsoleWorkspaceTrust, trustAgentConsoleWorkspace } from '../src/AgentConsoleSettingsWorkspaceTrust';
import { showAgentConsoleHooksDetail, showAgentConsolePluginDetail, showAgentConsoleSkillsDetail } from '../src/AgentConsoleSettingsDetailViews';

function createHost(overrides: any = {}): any {
    const calls: any[] = [];
    const notifications: string[] = [];
    const overlays: Array<{ title: string; lines: string[]; back?: () => void }> = [];
    const queued = [...(overrides.selectQueue || [])];
    return {
        calls,
        notifications,
        overlays,
        translator: undefined,
        state: {
            sessionId: 's1',
            openTextOverlay: (title: string, lines: string[], _visible?: number, back?: () => void) => { overlays.push({ title, lines, back }); },
            tools: [
                { name: 'mcp.fs.read', active: false },
                { name: 'mcp.fs.write', active: true }
            ]
        },
        options: {},
        activeThemeName: 'dark',
        yoloMode: false,
        modelReasoningEffort: 'medium',
        select: async () => queued.shift(),
        notify: (message: string) => { notifications.push(message); },
        persistSettings: async () => undefined,
        invokeTool: async (name: string, input: any) => {
            calls.push({ name, input });
            if (input?.action === 'list') {
                return { plugins: [{ id: 'p1', scope: 'workspace', manifest: { name: 'Demo', description: 'demo plugin' } }] };
            }
            return {};
        },
        refreshTools: async () => { calls.push({ name: 'refreshTools' }); },
        appRpc: {
            request: async (method: string, params: any) => {
                calls.push({ method, params });
                return {};
            }
        },
        rpcRequestContext: () => ({ requestId: 'r1' }),
        ...overrides
    };
}

@Suite('agent console settings integrations')
export class AgentConsoleSettingsIntegrationsTest {
    @Test('activates a plugin through the plugins tool')
    async activatesPlugin() {
        const host = createHost({ selectQueue: ['p1', 'activate'] });
        await manageAgentConsolePlugins(host);
        expect(host.calls).toEqual([
            { name: 'plugins', input: { action: 'list' } },
            { name: 'plugins', input: { action: 'activate', id: 'p1' } }
        ]);
        expect(host.notifications[0]).toContain('Demo');
    }

    @Test('removes a plugin only after the confirmation picker')
    async removesPluginWithConfirmation() {
        const host = createHost({ selectQueue: ['p1', 'remove', 'no'] });
        await manageAgentConsolePlugins(host);
        expect(host.calls.filter((call: any) => call.input?.action === 'remove')).toEqual([]);

        const confirmed = createHost({ selectQueue: ['p1', 'remove', 'yes'] });
        await manageAgentConsolePlugins(confirmed);
        expect(confirmed.calls).toContainEqual({ name: 'plugins', input: { action: 'remove', id: 'p1' } });
    }

    @Test('activates an inactive MCP tool through app RPC and refreshes tools')
    async activatesMcpTool() {
        const host = createHost({ selectQueue: ['mcp.fs.read'] });
        await activateAgentConsoleMcpTool(host);
        expect(host.calls).toContainEqual({
            method: 'tools.activate',
            params: { sessionId: 's1', name: 'mcp.fs.read' }
        });
        expect(host.calls).toContainEqual({ name: 'refreshTools' });
        expect(host.notifications[0]).toContain('mcp.fs.read');
    }

    @Test('reports when every MCP tool is already active')
    async noInactiveMcpTools() {
        const host = createHost();
        host.state.tools = [{ name: 'mcp.fs.read', active: true }];
        await activateAgentConsoleMcpTool(host);
        expect(host.calls).toEqual([]);
        expect(host.notifications[0]).toContain('already active');
    }

    @Test('workspace trust is reported and granted only after confirmation')
    async workspaceTrust() {
        const trusted = new Set<string>();
        const resolver = {
            isTrusted: (workspace: string) => trusted.has(workspace),
            trust: (workspace: string) => { trusted.add(workspace); }
        };
        const host = createHost({ selectQueue: ['no'] });
        host.app = { get: () => resolver };
        host.state.workspace = '/w';
        expect(describeAgentConsoleWorkspaceTrust(host)).toEqual('untrusted');
        await trustAgentConsoleWorkspace(host);
        expect(trusted.size).toEqual(0);

        host.select = async () => 'yes';
        await trustAgentConsoleWorkspace(host);
        expect(trusted.has('/w')).toEqual(true);
        expect(describeAgentConsoleWorkspaceTrust(host)).toEqual('trusted');
        expect(host.notifications[host.notifications.length - 1]).toContain('/w');
    }

    @Test('skills open a scrollable detail overlay with a back link')
    async skillsDetail() {
        const host = createHost({ selectQueue: ['code-review'] });
        host.invokeTool = async (name: string, input: any) => {
            host.calls.push({ name, input });
            if (name === 'skill_list') {
                return { skills: [{ id: 'code-review', title: 'Code review', summary: 'review diffs', category: 'code' }] };
            }
            if (name === 'read_skill') {
                return { skill: { id: 'code-review', title: 'Code review', summary: 'review diffs', source: 'builtin' } };
            }
            return {};
        };
        await showAgentConsoleSkillsDetail(host);
        expect(host.overlays.length).toEqual(1);
        expect(host.overlays[0].title).toContain('code-review');
        expect(host.overlays[0].lines.join('\n')).toContain('Code review');
        // Skills keep a back link to the picker so Esc returns to the list.
        expect(typeof host.overlays[0].back).toEqual('function');
    }

    @Test('hooks render their registered stages in the detail overlay')
    async hooksDetail() {
        const host = createHost();
        host.appRpc = {
            request: async (method: string) => {
                host.calls.push({ method });
                if (method === 'hooks.trust.list') {
                    return [
                        { stage: 'beforeTurn', name: 'npm test', trusted: true },
                        { stage: 'beforeTurn', name: 'npm run lint', trusted: false }
                    ];
                }
                return [{ stage: 'beforeTurn', commands: ['npm test'], functions: [] }];
            }
        };
        await showAgentConsoleHooksDetail(host);
        expect(host.overlays.length).toEqual(1);
        const text = host.overlays[0].lines.join('\n');
        expect(text).toContain('beforeTurn');
        expect(text).toContain('npm test');
        expect(text).toContain('trusted 1/2');
        expect(text).toContain('[trusted] beforeTurn · npm test');
        expect(text).toContain('[untrusted] beforeTurn · npm run lint');
        // No back link: Esc closes the overlay instead of reopening it.
        expect(host.overlays[0].back).toEqual(undefined);
    }

    @Test('hooks detail reports when nothing is registered')
    async hooksEmpty() {
        const host = createHost();
        host.runtime = { getHookSummary: () => [] };
        await showAgentConsoleHooksDetail(host);
        expect(host.overlays).toEqual([]);
        expect(host.notifications[0]).toBeTruthy();
    }

    @Test('plugin detail inspects contributions before opening the overlay')
    async pluginDetail() {
        const host = createHost();
        host.invokeTool = async (name: string, input: any) => {
            host.calls.push({ name, input });
            return { plugin: { id: 'p1', manifest: { name: 'Demo', description: 'demo plugin' } }, contributions: { skills: 1 } };
        };
        await showAgentConsolePluginDetail(host, { id: 'p1', manifest: { name: 'Demo' } });
        expect(host.calls[0]).toEqual({ name: 'plugins', input: { action: 'inspect', id: 'p1' } });
        expect(host.overlays[0].title).toEqual('Demo');
        expect(host.overlays[0].lines.join('\n')).toContain('Demo');
    }
}
