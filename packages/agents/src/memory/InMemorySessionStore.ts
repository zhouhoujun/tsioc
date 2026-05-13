import { Injectable } from '@tsdi/ioc';
import { SessionStore } from './SessionStore';
import { AgentState } from '../runtime/AgentState';
import { AgentMessage } from '../runtime/AgentMessage';

@Injectable()
export class InMemorySessionStore extends SessionStore {
    private sessions = new Map<string, AgentState>();

    async get(sessionId: string): Promise<AgentState> {
        let state = this.sessions.get(sessionId);
        if (!state) {
            state = { sessionId, messages: [] };
            this.sessions.set(sessionId, state);
        }
        return {
            sessionId: state.sessionId,
            messages: state.messages.slice(),
            summary: state.summary
        };
    }

    async append(sessionId: string, message: AgentMessage): Promise<AgentState> {
        const state = await this.get(sessionId);
        state.messages.push(message);
        this.sessions.set(sessionId, state);
        return this.get(sessionId);
    }

    async setSummary(sessionId: string, summary: string): Promise<void> {
        const state = await this.get(sessionId);
        state.summary = summary;
        this.sessions.set(sessionId, state);
    }

    clear(): void {
        this.sessions.clear();
    }
}
