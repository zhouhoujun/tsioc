import type { AgentConsoleTurnStreamState } from './AgentConsoleTurnStreamController';

/**
 * Per-session turn scratch state and in-flight run handles. Tabs are independent
 * sessions: a turn in one tab must keep its own streaming text, assistant row
 * and run promise while the user switches to another tab.
 */
export class AgentConsoleTurnRuntimeRegistry {
    private readonly states = new Map<string, AgentConsoleTurnStreamState>();
    private readonly runs = new Map<string, Promise<void>>();

    stateFor(sessionId: string): AgentConsoleTurnStreamState {
        let state = this.states.get(sessionId);
        if (!state) {
            state = { streamMessageText: '', sealedNarrationCount: 0, reasoningText: '', reasoningPhase: '' };
            this.states.set(sessionId, state);
        }
        return state;
    }

    runFor(sessionId: string): Promise<void> | undefined {
        return this.runs.get(sessionId);
    }

    setRun(sessionId: string, run?: Promise<void> | null): void {
        if (run) {
            this.runs.set(sessionId, run);
        } else {
            this.runs.delete(sessionId);
        }
    }

    isRunning(sessionId: string): boolean {
        return this.runs.has(sessionId);
    }

    forget(sessionId: string): void {
        this.runs.delete(sessionId);
        this.states.delete(sessionId);
    }
}
