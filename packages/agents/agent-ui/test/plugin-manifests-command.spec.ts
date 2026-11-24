import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { runPluginsCommand } from '../src/AgentConsoleExtensionCommands';

function host(plugins: any[], calls: any[] = []) {
    const outputs: Array<{ command: string; text: string }> = [];
    const notices: string[] = [];
    return {
        outputs,
        notices,
        host: {
            translator: null,
            state: {},
            options: {},
            notify: (message: string) => notices.push(message),
            select: async () => undefined,
            pushCommandOutput: (command: string, text: string) => outputs.push({ command, text }),
            invokeTool: async () => ({ plugins: [] }),
            appRpc: {
                request: async (method: string, params: any) => {
                    calls.push({ method, params });
                    if (method === 'plugin.list') return { plugins };
                    return { applied: true };
                }
            },
            rpcRequestContext: () => ({})
        } as any
    };
}

@Suite('/plugins manifest command')
export class PluginManifestsCommandTest {
    @Test('lists agent plugin manifests over RPC before the tool fallback')
    async listsManifests() {
        const fixture = host([
            { id: 'demo', name: 'Demo', version: '1.0.0', enabled: true },
            { id: 'off', enabled: false }
        ]);
        await runPluginsCommand(fixture.host);
        expect(fixture.outputs[0].command).toEqual('/plugins');
        expect(fixture.outputs[0].text).toContain('demo · enabled');
        expect(fixture.outputs[0].text).toContain('off · disabled');
        expect(fixture.outputs[0].text).toContain('v1.0.0');
    }

    @Test('enable/disable sends plugin.set_enabled')
    async togglesManifest() {
        const calls: any[] = [];
        const fixture = host([{ id: 'demo', enabled: true }], calls);
        await runPluginsCommand(fixture.host, 'disable demo');
        expect(calls[0]).toEqual({ method: 'plugin.set_enabled', params: { id: 'demo', enabled: false } });
        expect(fixture.notices.length).toEqual(1);
        await runPluginsCommand(fixture.host, 'enable demo');
        expect(calls[1]).toEqual({ method: 'plugin.set_enabled', params: { id: 'demo', enabled: true } });
    }
}
