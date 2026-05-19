import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { LineAgentChannel, LineAgentChannelModule } from '@tsdi/agents/agent-channels/line';
import { provideChannels } from '../src/provider';

@Suite('LINE agent channel')
export class LineAgentChannelTest {

    @Test('registers LINE channel from imported subpath module')
    async registersLineChannel() {
        const ctx = await Application.run({ module: { providers: [...provideChannels(
            { imports: [LineAgentChannelModule.withOptions({ channelAccessToken: 'tok', channelSecret: 'sec' })] }
        )] } });
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('line') as LineAgentChannel;
            expect(channel).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('reports healthy only when configured')
    async reportsConfigured() {
        const unconfigured = new LineAgentChannel();
        expect((await unconfigured.healthCheck()).message).toContain('false');

        const configured = new LineAgentChannel({ channelAccessToken: 'tok', channelSecret: 'sec' });
        expect((await configured.healthCheck()).message).toContain('true');
    }

    @Test('exposes correct capabilities')
    async exposesCapabilities() {
        const channel = new LineAgentChannel();
        expect(channel.capabilities()).toContain('freeform');
        expect(channel.supportsFreeFormAsk()).toBe(true);
    }
}
