import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { AgentConversationChannel } from '../src/contracts/AgentConversationChannel';
import { ChannelCapability } from '../src/contracts/ChannelCapability';
import { HealthStatus } from '../src/contracts/HealthStatus';
import { ChannelMessage } from '../src/contracts/ChannelMessage';
import { SendMessage } from '../src/contracts/SendMessage';

class StubChannel implements AgentConversationChannel {
    constructor(private readonly channelName: string) {
    }

    name(): string {
        return this.channelName;
    }

    async send(message: SendMessage): Promise<string> {
        return `stub-${message.channel}`;
    }

    listen(handler: (message: ChannelMessage) => Promise<void> | void): void {
        // no-op
    }

    healthCheck(): HealthStatus {
        return { healthy: true };
    }

    capabilities(): ChannelCapability[] {
        return [];
    }

    supportsFreeFormAsk(): boolean {
        return false;
    }

    supportsDraftUpdates(): boolean {
        return false;
    }

    supportsMultiMessageStreaming(): boolean {
        return false;
    }

    multiMessageDelayMs(): number {
        return 0;
    }
}

@Suite('Agent channel registry')
export class AgentChannelRegistryTest {
    @Test('registers and resolves channels by name')
    registerAndResolve() {
        const loopback = new StubChannel('loopback');
        const registry = new AgentChannelRegistry([loopback]);
        expect(registry.get('loopback')).toBe(loopback);
        expect(registry.getAll().length).toBe(1);
    }

    @Test('rejects duplicate channel names')
    rejectDuplicateNames() {
        const registry = new AgentChannelRegistry();
        registry.register(new StubChannel('dup'));
        expect(() => registry.register(new StubChannel('dup'))).toThrow(/duplicate channel/);
    }
}
