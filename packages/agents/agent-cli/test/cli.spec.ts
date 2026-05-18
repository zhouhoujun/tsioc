import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { createAgentCli, resolveCliConfig, runAgentPrompt } from '../src';

@Suite('Agent CLI')
export class AgentCliTest {
    @Test('resolves cli config for tools and channels')
    resolvesCliConfig() {
        const resolved = resolveCliConfig({
            session: 's1',
            cwd: '/tmp/work',
            tools: 'filesystem,http_fetch',
            channels: 'local,wechat',
            defaultTools: false,
            defaultChannels: false
        });
        expect(resolved.sessionId).toBe('s1');
        expect(resolved.tools.file?.rootDir).toBe('/tmp/work');
        expect(resolved.tools.registration?.preset).toBe('none');
        expect((resolved.tools.registration?.groups as any).filesystem).toBe(true);
        expect((resolved.tools.registration?.items as any).http_fetch).toBe(true);
        expect((resolved.tools.registration?.groups as any).http_fetch).toBe(undefined);
        expect(resolved.channels.registration?.preset).toBe('none');
        expect((resolved.channels.registration?.groups as any).local).toBe(true);
        expect((resolved.channels.registration?.items as any).wechat).toBe(true);
        expect((resolved.channels.registration?.groups as any).wechat).toBe(undefined);
        expect(resolved.channels.defaultChannel).toBe('local');
    }

    @Test('creates cli commands')
    createsCliCommands() {
        const cli = createAgentCli();
        expect(cli.commands.some(cmd => cmd.name() === 'run')).toBe(true);
        expect(cli.commands.some(cmd => cmd.name() === 'tools')).toBe(true);
        expect(cli.commands.some(cmd => cmd.name() === 'chat')).toBe(true);
    }

    @Test('runs prompt through echo model runtime')
    async runsPromptThroughEchoModelRuntime() {
        const output = await runAgentPrompt('hello cli', { session: 'cli-1' });
        expect(output).toBe('Echo: hello cli');
    }

    @Test('accepts tool item names without treating them as groups')
    async acceptsToolItemNamesWithoutTreatingThemAsGroups() {
        const resolved = resolveCliConfig({ tools: 'http_fetch' });
        expect((resolved.tools.registration?.items as any).http_fetch).toBe(true);
        expect((resolved.tools.registration?.groups as any).http_fetch).toBe(undefined);
        const output = await runAgentPrompt('hello item tool', { session: 'cli-2', tools: 'http_fetch' });
        expect(output).toBe('Echo: hello item tool');
    }
}
