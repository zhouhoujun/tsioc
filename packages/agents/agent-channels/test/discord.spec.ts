import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { DiscordAgentChannel, DiscordAgentChannelModule } from '@tsdi/agents/agent-channels/discord';
import { provideChannels } from '../src/provider';

@Suite('Discord agent channel')
export class DiscordAgentChannelTest {

    @Test('registers discord channel from imported subpath module')
    async registersDiscordChannel() {
        const ctx = await Application.run({ module: { providers: [...provideChannels(
            { imports: [DiscordAgentChannelModule.withOptions({ botToken: 'tok', applicationId: 'app' })] }
        )] } });
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('discord') as DiscordAgentChannel;
            expect(channel).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('reports healthy only when configured with botToken')
    async reportsConfigured() {
        const unconfigured = new DiscordAgentChannel();
        expect((await unconfigured.healthCheck()).message).toContain('false');

        const configured = new DiscordAgentChannel({ botToken: 'tok' });
        expect((await configured.healthCheck()).message).toContain('true');
    }

    @Test('exposes rich capabilities')
    async exposesCapabilities() {
        const channel = new DiscordAgentChannel();
        expect(channel.capabilities()).toContain('threading');
        expect(channel.capabilities()).toContain('voice');
        expect(channel.capabilities()).toContain('reactions');
        expect(channel.supportsMultiMessageStreaming()).toBe(true);
    }
}
