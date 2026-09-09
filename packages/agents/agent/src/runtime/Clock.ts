import { Injectable, token } from '@tsdi/ioc';

export abstract class AgentClock {
    abstract now(): number;
    abstract sleep(ms: number): Promise<void>;
}

export const AGENT_CLOCK = token<AgentClock>('AGENT_CLOCK');

@Injectable()
export class SystemAgentClock extends AgentClock {
    now(): number { return Date.now(); }
    sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, Math.max(0, ms))); }
}

export class DeterministicAgentClock extends AgentClock {
    private current: number;
    constructor(initial = 0) { super(); this.current = initial; }
    now(): number { return this.current; }
    advance(ms: number): void { this.current += Math.max(0, ms); }
    async sleep(ms: number): Promise<void> { this.advance(ms); }
}
