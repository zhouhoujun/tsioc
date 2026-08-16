import * as crypto from 'crypto';
import { Injectable } from '@tsdi/ioc';
import { AgentMessage } from '@tsdi/agent';

export interface SessionShareSnapshot {
    id: string;
    token: string;
    sessionId: string;
    createdAt: number;
    title?: string;
    summary?: string;
    messages: AgentMessage[];
}

const SECRET_KEY = /(api[-_]?key|token|secret|password|authorization|cookie)/i;
const SECRET_VALUE = /(Bearer\s+)[A-Za-z0-9._-]+|\b(sk-[A-Za-z0-9_-]{8,})\b/gi;

export function redactSharedValue(value: any, workspace?: string): any {
    if (typeof value === 'string') {
        let result = value.replace(SECRET_VALUE, match => match.startsWith('Bearer ') ? 'Bearer [REDACTED]' : '[REDACTED]');
        if (workspace) result = result.split(workspace).join('[WORKSPACE]');
        return result;
    }
    if (Array.isArray(value)) return value.map(item => redactSharedValue(item, workspace));
    if (!value || typeof value !== 'object') return value;
    const output: Record<string, any> = {};
    for (const [key, item] of Object.entries(value)) {
        if (SECRET_KEY.test(key)) output[key] = '[REDACTED]';
        else if (key === 'imageUrl') output[key] = '[MEDIA REMOVED]';
        else output[key] = redactSharedValue(item, workspace);
    }
    return output;
}

@Injectable()
export class SessionShareStore {
    private snapshots = new Map<string, SessionShareSnapshot>();
    create(input: Omit<SessionShareSnapshot, 'id' | 'token' | 'createdAt'>, workspace?: string): SessionShareSnapshot {
        const snapshot: SessionShareSnapshot = {
            ...redactSharedValue(input, workspace),
            id: crypto.randomBytes(12).toString('hex'),
            token: crypto.randomBytes(24).toString('base64url'),
            createdAt: Date.now()
        };
        this.snapshots.set(snapshot.token, snapshot);
        return snapshot;
    }
    get(token: string): SessionShareSnapshot | undefined { return this.snapshots.get(token); }
    revoke(token: string): boolean { return this.snapshots.delete(token); }
    listBySession(sessionId: string): SessionShareSnapshot[] {
        const entries = Array.from(this.snapshots.values()).filter(item => item.sessionId === sessionId);
        return entries.sort((left, right) => right.createdAt - left.createdAt);
    }
}
