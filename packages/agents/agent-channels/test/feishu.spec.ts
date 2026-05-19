import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { FeishuAgentChannel, FeishuAgentChannelModule } from '@tsdi/agents/agent-channels/feishu';
import { provideChannels } from '../src/provider';

@Suite('Feishu agent channel')
export class FeishuAgentChannelTest {

    @Test('registers feishu channel from imported subpath module')
    async registersFeishuChannel() {
        const ctx = await Application.run({ module: { providers: [...provideChannels(
            { imports: [FeishuAgentChannelModule.withOptions({ appId: 'aid', appSecret: 'as' })] }
        )] } });
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('feishu') as FeishuAgentChannel;
            expect(channel).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('reports healthy only when configured')
    async reportsConfigured() {
        const unconfigured = new FeishuAgentChannel();
        expect((await unconfigured.healthCheck()).message).toContain('false');

        const configured = new FeishuAgentChannel({ appId: 'aid', appSecret: 'as' });
        expect((await configured.healthCheck()).message).toContain('true');
    }

    @Test('exposes correct features')
    async exposesFeatures() {
        const channel = new FeishuAgentChannel();
        expect(channel.capabilities()).toContain('freeform');
        expect(channel.capabilities()).toContain('files');
        expect(channel.supportsFreeFormAsk()).toBe(true);
    }
}
