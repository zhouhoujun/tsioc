import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { TelegramAgentChannel, TelegramAgentChannelModule } from '@tsdi/agents/agent-channels/telegram';
import { provideChannels } from '../src/provider';

@Suite('Telegram agent channel')
export class TelegramAgentChannelTest {

    @Test('registers telegram channel from imported subpath module')
    async registersTelegramChannel() {
        const ctx = await Application.run({ module: { providers: [...provideChannels(
            { imports: [TelegramAgentChannelModule.withOptions({ botToken: 'tok' })] }
        )] } });
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('telegram') as TelegramAgentChannel;
            expect(channel).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('reports healthy only when configured with botToken')
    async reportsConfigured() {
        const unconfigured = new TelegramAgentChannel();
        expect((await unconfigured.healthCheck()).message).toContain('false');

        const configured = new TelegramAgentChannel({ botToken: 'tok' });
        expect((await configured.healthCheck()).message).toContain('true');
    }

    @Test('exposes rich capabilities')
    async exposesCapabilities() {
        const channel = new TelegramAgentChannel();
        expect(channel.capabilities()).toContain('freeform');
        expect(channel.capabilities()).toContain('approval');
        expect(channel.capabilities()).toContain('voice');
        expect(channel.supportsDraftUpdates()).toBe(true);
        expect(channel.supportsMultiMessageStreaming()).toBe(true);
        expect(channel.multiMessageDelayMs()).toBe(800);
    }
}
