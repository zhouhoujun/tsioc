import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { QQAgentChannel, QQAgentChannelModule } from '@tsdi/agents/agent-channels/qq';
import { provideAgentChannels } from '../src/provider';

@Suite('QQ agent channel')
export class QQAgentChannelTest {

    @Test('registers QQ channel from imported subpath module')
    async registersQQChannel() {
        const ctx = await Application.run(provideAgentChannels(
            { imports: [QQAgentChannelModule.withOptions({ appId: 'aid', botToken: 'tok' })] }
        ));
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('qq') as QQAgentChannel;
            expect(channel).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('reports healthy only when configured')
    async reportsConfigured() {
        const unconfigured = new QQAgentChannel();
        expect((await unconfigured.healthCheck()).message).toContain('false');

        const configured = new QQAgentChannel({ appId: 'aid', botToken: 'tok' });
        expect((await configured.healthCheck()).message).toContain('true');
    }

    @Test('exposes correct capabilities')
    async exposesCapabilities() {
        const channel = new QQAgentChannel();
        expect(channel.capabilities()).toContain('freeform');
        expect(channel.supportsFreeFormAsk()).toBe(true);
    }
}
