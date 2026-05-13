import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentChannelRegistry } from '../src/orchestrator/AgentChannelRegistry';
import { AgentConversationChannel } from '../src/contracts/AgentConversationChannel';

class StubChannel implements AgentConversationChannel {
    constructor(private readonly channelName: string) {
    }

    name(): string {
        return this.channelName;
    }

    async send(): Promise<void> {
        return;
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
