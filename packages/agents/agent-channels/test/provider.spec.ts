import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { provideAgentChannels } from '../src/provider';
import { AGENT_CHANNEL_OPTIONS } from '../src/tokens';
import { SSEAgentChannel } from '../src/adapters/SSEAgentChannel';
import { WebhookAgentChannel } from '../src/adapters/WebhookAgentChannel';

class ExternalTestChannel extends BaseAgentChannel {
    name(): string {
        return 'external-test';
    }

    async send(message: SendMessage): Promise<string> {
        return `external-${message.channel}`;
    }

    async listen(_handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> {
        return;
    }
}

@Suite('Agent channel providers')
export class AgentChannelProviderTest {
    @Test('registers external channels through provideAgentChannels')
    async registersExternalChannels() {
        const ctx = await Application.run(provideAgentChannels({ defaultChannel: 'external-test' }, ExternalTestChannel));
        try {
            const registry = ctx.get(AgentChannelRegistry);
            const options = ctx.get(AGENT_CHANNEL_OPTIONS) as any;
            expect(registry.get('external-test')).toBeTruthy();
            expect(registry.get('loopback')).toBeTruthy();
            expect(registry.getAll().map(channel => channel.name())).toContain('external-test');
            expect(options.defaultChannel).toBe('external-test');
        } finally {
            await ctx.close();
        }
    }

    @Test('applies shared auth config to built-in webhook and sse channels')
    async appliesSharedAuthConfig() {
        const ctx = await Application.run(provideAgentChannels({
            sse: { auth: { bearerToken: 'sse-secret' } },
            webhook: { auth: { bearerToken: 'webhook-secret' }, secret: 'signing-secret' }
        }));
        try {
            const sse = ctx.get(SSEAgentChannel) as any;
            const webhook = ctx.get(WebhookAgentChannel) as any;
            expect(sse.options.auth.bearerToken).toBe('sse-secret');
            expect(webhook.options.auth.bearerToken).toBe('webhook-secret');
            expect(webhook.options.secret).toBe('signing-secret');
        } finally {
            await ctx.close();
        }
    }
}
