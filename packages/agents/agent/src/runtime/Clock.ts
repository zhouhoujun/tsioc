import { Injectable, token } from '@tsdi/ioc';

export abstract class AgentClock {
    abstract now(): number;
    abstract sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

export const AGENT_CLOCK = token<AgentClock>('AGENT_CLOCK');

@Injectable()
export class SystemAgentClock extends AgentClock {
    now(): number { return Date.now(); }
    sleep(ms: number, signal?: AbortSignal): Promise<void> {
        return new Promise(resolve => {
            if (signal?.aborted) {
                resolve();
                return;
            }
            const timer = setTimeout(resolve, Math.max(0, ms));
            signal?.addEventListener('abort', () => {
                clearTimeout(timer);
                resolve();
            }, { once: true });
        });
    }
}

export class DeterministicAgentClock extends AgentClock {
    private current: number;
    constructor(initial = 0) { super(); this.current = initial; }
    now(): number { return this.current; }
    advance(ms: number): void { this.current += Math.max(0, ms); }
    async sleep(ms: number, signal?: AbortSignal): Promise<void> {
        if (!signal?.aborted) this.advance(ms);
    }
}
