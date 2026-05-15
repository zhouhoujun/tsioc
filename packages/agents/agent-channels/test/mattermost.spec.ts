import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { MattermostAgentChannel, MattermostAgentChannelModule } from '@tsdi/agents/agent-channels/mattermost';
import { provideAgentChannels } from '../src/provider';

@Suite('Mattermost agent channel')
export class MattermostAgentChannelTest {

    @Test('registers mattermost channel from imported subpath module')
    async registersMattermostChannel() {
        const ctx = await Application.run(provideAgentChannels(
            { imports: [MattermostAgentChannelModule.withOptions({ serverUrl: 'https://mm.example.com', botToken: 'tok' })] }
        ));
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('mattermost') as MattermostAgentChannel;
            expect(channel).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('reports healthy only when configured')
    async reportsConfigured() {
        const unconfigured = new MattermostAgentChannel();
        expect((await unconfigured.healthCheck()).message).toContain('false');

        const configured = new MattermostAgentChannel({ serverUrl: 'https://mm.example.com', botToken: 'tok' });
        expect((await configured.healthCheck()).message).toContain('true');
    }

    @Test('exposes correct capabilities')
    async exposesCapabilities() {
        const channel = new MattermostAgentChannel();
        expect(channel.capabilities()).toContain('freeform');
        expect(channel.capabilities()).toContain('threading');
        expect(channel.supportsFreeFormAsk()).toBe(true);
    }
}
