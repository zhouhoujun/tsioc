import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { WechatSignatureService } from '@tsdi/security';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { ChannelEnvelopeMapper } from '../src/orchestrator/ChannelEnvelopeMapper';
import { AgentChannelOrchestrator } from '../src/orchestrator/AgentChannelOrchestrator';
import { WechatAgentChannel, WechatAgentChannelModule } from '@tsdi/agent-channels/wechat';
import { provideAgentChannels } from '../src/provider';

class ServerStub {
    async execute(request: any): Promise<any> {
        return {
            sessionId: request.sessionId,
            output: `Echo: ${request.input}`
        };
    }
}

@Suite('Wechat agent channel')
export class WechatAgentChannelTest {
    @Test('registers wechat channel from imported subpath module')
    async registersWechatChannel() {
        const ctx = await Application.run(provideAgentChannels({ imports: [WechatAgentChannelModule.withOptions({ token: 'wx-token' })] }));
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const channel = registry.get('wechat') as WechatAgentChannel;
            expect(channel).toBeTruthy();
            const health = await channel.healthCheck();
            expect(health.message).toContain('true');
        } finally {
            await ctx.close();
        }
    }

    @Test('supports local inbound dispatch for wechat channel')
    async supportsInboundDispatch() {
        const channel = new WechatAgentChannel(new WechatSignatureService());
        const registry = new AgentChannelRegistry([channel]);
        const orchestrator = new AgentChannelOrchestrator(new ServerStub() as any, new ChannelEnvelopeMapper(), registry);
        const inbound: ChannelMessage = {
            id: 'wx-1',
            channel: 'wechat',
            sender: 'user-1',
            content: 'hello',
            timestamp: Date.now()
        };

        await channel.listen((message) => orchestrator.dispatch(message));
        await channel.emitInbound(inbound);

        expect(channel.sent.length).toBe(1);
        expect(channel.sent[0].content).toBe('Echo: hello');
        expect(channel.capabilities()).toEqual(['freeform']);
    }

    @Test('verifies wechat ingress signature with shared security service')
    verifiesIngressSignature() {
        const signatures = new WechatSignatureService();
        const channel = new WechatAgentChannel(signatures, { token: 'wechat-token' });
        const signature = signatures.sign('wechat-token', '1710000000', 'nonce');
        expect(channel.verifyIngressSignature(signature, '1710000000', 'nonce')).toBe(true);
        expect(channel.verifyIngressSignature('deadbeef', '1710000000', 'nonce')).toBe(false);
    }
}
