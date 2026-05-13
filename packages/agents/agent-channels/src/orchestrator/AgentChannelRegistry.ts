import { Inject, Injectable } from '@tsdi/ioc';
import { AGENT_CHANNELS } from '../tokens';
import { AgentConversationChannel } from '../contracts/AgentConversationChannel';

@Injectable()
export class AgentChannelRegistry {
    private readonly channels = new Map<string, AgentConversationChannel>();

    constructor(@Inject(AGENT_CHANNELS, { nullable: true }) channels: AgentConversationChannel[] = []) {
        channels.forEach(channel => this.register(channel));
    }

    register(channel: AgentConversationChannel): void {
        const name = channel.name();
        if (!name) {
            throw new Error('channel name is required');
        }
        if (this.channels.has(name)) {
            throw new Error(`duplicate channel: ${name}`);
        }
        this.channels.set(name, channel);
    }

    get(name: string): AgentConversationChannel | undefined {
        return this.channels.get(name);
    }

    getAll(): AgentConversationChannel[] {
        return Array.from(this.channels.values());
    }

    async health(): Promise<Record<string, boolean>> {
        const entries = await Promise.all(this.getAll().map(async channel => {
            const status = channel.healthCheck ? await channel.healthCheck() : true;
            return [channel.name(), status] as const;
        }));
        return Object.fromEntries(entries);
    }
}
