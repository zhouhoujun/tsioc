import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { MatrixAgentChannel, MatrixAgentChannelModule } from '@tsdi/agents/agent-channels/matrix';
import { provideChannels } from '../src/provider';

@Suite('Matrix agent channel')
export class MatrixAgentChannelTest {

    @Test('registers matrix channel from imported subpath module')
    async registersMatrixChannel() {
        const ctx = await Application.run({ module: { providers: [...provideChannels(
            { imports: [MatrixAgentChannelModule.withOptions({ homeserverUrl: 'https://matrix.org', accessToken: 'tok' })] }
        )] } });
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('matrix') as MatrixAgentChannel;
            expect(channel).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('reports healthy only when configured')
    async reportsConfigured() {
        const unconfigured = new MatrixAgentChannel();
        expect((await unconfigured.healthCheck()).message).toContain('false');

        const configured = new MatrixAgentChannel({ homeserverUrl: 'https://matrix.org', accessToken: 'tok' });
        expect((await configured.healthCheck()).message).toContain('true');
    }

    @Test('exposes threading capability')
    async exposesThreading() {
        const channel = new MatrixAgentChannel();
        expect(channel.capabilities()).toContain('threading');
        expect(channel.supportsFreeFormAsk()).toBe(true);
    }
}
