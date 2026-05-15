import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { SlackAgentChannel, SlackAgentChannelModule } from '@tsdi/agents/agent-channels/slack';
import { provideAgentChannels } from '../src/provider';

@Suite('Slack agent channel')
export class SlackAgentChannelTest {

    @Test('registers slack channel from imported subpath module')
    async registersSlackChannel() {
        const ctx = await Application.run(provideAgentChannels(
            { imports: [SlackAgentChannelModule.withOptions({ botToken: 'tok' })] }
        ));
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('slack') as SlackAgentChannel;
            expect(channel).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('reports healthy only when configured with botToken')
    async reportsConfigured() {
        const unconfigured = new SlackAgentChannel();
        expect((await unconfigured.healthCheck()).message).toContain('false');

        const configured = new SlackAgentChannel({ botToken: 'tok' });
        expect((await configured.healthCheck()).message).toContain('true');
    }

    @Test('exposes approval capability')
    async exposesApproval() {
        const channel = new SlackAgentChannel();
        expect(channel.capabilities()).toContain('approval');
        expect(channel.capabilities()).toContain('threading');
        expect(channel.supportsFreeFormAsk()).toBe(true);
    }
}
