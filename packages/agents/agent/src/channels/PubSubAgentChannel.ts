import { Injectable } from '@tsdi/ioc';
import { AgentResponse } from './AgentResponse';

@Injectable()
export class PubSubAgentChannel {
    private listeners = new Set<(response: AgentResponse) => void>();

    subscribe(listener: (response: AgentResponse) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    publish(response: AgentResponse): void {
        this.listeners.forEach(listener => listener(response));
    }
}
