import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { WecomAgentChannel, WecomAgentChannelModule } from '@tsdi/agents/agent-channels/wecom';
import { provideAgentChannels } from '../src/provider';

@Suite('Wecom agent channel')
export class WecomAgentChannelTest {

    @Test('registers wecom channel from imported subpath module')
    async registersWecomChannel() {
        const ctx = await Application.run(provideAgentChannels(
            { imports: [WecomAgentChannelModule.withOptions({ botId: 'wb', secret: 'sec' })] }
        ));
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('wecom') as WecomAgentChannel;
            expect(channel).toBeTruthy();
            const health = await channel.healthCheck();
            expect(health.healthy).toBe(true);
        } finally {
            await ctx.close();
        }
    }

    @Test('reports healthy only when configured')
    async reportsConfigured() {
        const channel = new WecomAgentChannel();
        expect((await channel.healthCheck()).message).toContain('false');

        const configured = new WecomAgentChannel({ botId: 'wb', secret: 's' });
        expect((await configured.healthCheck()).message).toContain('true');
    }

    @Test('exposes correct capabilities')
    async exposesCapabilities() {
        const channel = new WecomAgentChannel();
        const caps = channel.capabilities();
        expect(caps).toContain('freeform');
        expect(channel.supportsFreeFormAsk()).toBe(true);
    }
}
