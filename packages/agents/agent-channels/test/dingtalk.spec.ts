import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { DingtalkAgentChannel, DingtalkAgentChannelModule } from '@tsdi/agents/agent-channels/dingtalk';
import { provideAgentChannels } from '../src/provider';

@Suite('DingTalk agent channel')
export class DingtalkAgentChannelTest {

    @Test('registers dingtalk channel from imported subpath module')
    async registersDingtalkChannel() {
        const ctx = await Application.run(provideAgentChannels(
            { imports: [DingtalkAgentChannelModule.withOptions({ clientId: 'cid', clientSecret: 'cs' })] }
        ));
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('dingtalk') as DingtalkAgentChannel;
            expect(channel).toBeTruthy();
        } finally {
            await ctx.close();
        }
    }

    @Test('reports healthy only when configured')
    async reportsConfigured() {
        const unconfigured = new DingtalkAgentChannel();
        expect((await unconfigured.healthCheck()).message).toContain('false');

        const configured = new DingtalkAgentChannel({ clientId: 'cid', clientSecret: 'cs' });
        expect((await configured.healthCheck()).message).toContain('true');
    }

    @Test('exposes correct capabilities')
    async exposesCapabilities() {
        const channel = new DingtalkAgentChannel();
        expect(channel.capabilities()).toContain('freeform');
        expect(channel.capabilities()).toContain('streaming');
        expect(channel.supportsFreeFormAsk()).toBe(true);
    }
}
