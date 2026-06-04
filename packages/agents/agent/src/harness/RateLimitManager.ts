import { Injectable } from '@tsdi/ioc';
import { AgentToolRateLimitPolicy } from '../tools/AgentTool';

interface RateLimitWindow {
    count: number;
    windowStart: number;
}

@Injectable()
export class RateLimitManager {
    private windows = new Map<string, RateLimitWindow>();

    checkToolLimitOrThrow(toolName: string, sessionId: string, policy?: AgentToolRateLimitPolicy): void {
        if (!policy) {
            return;
        }
        const key = this.buildKey(toolName, sessionId, policy.scope ?? 'session');
        const now = Date.now();
        const current = this.windows.get(key);
        if (!current || now - current.windowStart >= policy.windowMs) {
            this.windows.set(key, { count: 1, windowStart: now });
            return;
        }
        const nextCount = current.count + 1;
        this.windows.set(key, { count: nextCount, windowStart: current.windowStart });
        if (nextCount > policy.maxCalls) {
            throw new Error(`Tool "${toolName}" rate limit exceeded.`);
        }
    }

    private buildKey(toolName: string, sessionId: string, scope: 'session' | 'global'): string {
        return scope === 'global'
            ? `global:${toolName}`
            : `session:${sessionId}:${toolName}`;
    }
}
