import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { activateAgentConsoleMcpTool, manageAgentConsolePlugins } from '../src/AgentConsoleSettingsIntegrationActions';

function createHost(overrides: any = {}): any {
    const calls: any[] = [];
    const notifications: string[] = [];
    const queued = [...(overrides.selectQueue || [])];
    return {
        calls,
        notifications,
        translator: undefined,
        state: {
            sessionId: 's1',
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
}
