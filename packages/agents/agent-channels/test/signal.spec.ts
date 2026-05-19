import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { SignalAgentChannel, SignalAgentChannelModule } from '@tsdi/agents/agent-channels/signal';
import { provideChannels } from '../src/provider';

@Suite('Signal agent channel')
export class SignalAgentChannelTest {

    @Test('registers signal channel from imported subpath module')
    async registersSignalChannel() {
        const ctx = await Application.run({ module: { providers: [...provideChannels(
            { imports: [SignalAgentChannelModule.withOptions({ phoneNumber: '+8613800000000' })] }
        )] } });
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('signal') as SignalAgentChannel;
            expect(channel).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('reports healthy only when configured with phoneNumber')
    async reportsConfigured() {
        const unconfigured = new SignalAgentChannel();
        expect((await unconfigured.healthCheck()).message).toContain('false');

        const configured = new SignalAgentChannel({ phoneNumber: '+8613800000000' });
        expect((await configured.healthCheck()).message).toContain('true');
    }

    @Test('exposes correct capabilities')
    async exposesCapabilities() {
        const channel = new SignalAgentChannel();
        expect(channel.capabilities()).toContain('freeform');
        expect(channel.capabilities()).toContain('attachments');
        expect(channel.supportsFreeFormAsk()).toBe(true);
    }
}
