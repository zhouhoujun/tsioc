import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { AGENT_CHANNELS } from '../src/tokens';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { provideAgentChannels } from '../src/provider';
import { BaseAgentChannel } from '../src/contracts/BaseAgentChannel';
import { SendMessage } from '../src/contracts/SendMessage';
import { ChannelMessage } from '../src/contracts/ChannelMessage';

class ImportedTestChannel extends BaseAgentChannel {
    name(): string {
        return 'imported-test';
    }

    async send(message: SendMessage): Promise<string> {
        return `imported-${message.channel}`;
    }

    async listen(_handler: (message: ChannelMessage) => Promise<void> | void): Promise<void> {
        return;
    }
}

@Module({
    providers: [
        ImportedTestChannel,
        { provide: AGENT_CHANNELS, useExisting: ImportedTestChannel, multi: true }
    ]
})
class ImportedChannelModule {
}

@Suite('Agent channel imported modules')
export class AgentChannelImportsTest {
    @Test('registers channels from imported modules')
    async registersImportedChannels() {
        const ctx = await Application.run(provideAgentChannels({ imports: [ImportedChannelModule] }));
        try {
            const registry = ctx.get(AgentChannelRegistry);
            expect(registry.get('imported-test')).toBeTruthy();
            expect(registry.getAll().map(channel => channel.name())).toContain('imported-test');
        } finally {
            await ctx.close();
        }
    }
}
