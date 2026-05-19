import { Injectable } from '@tsdi/ioc';

@Injectable()
export class SkillSessionStore {
    private active = new Map<string, Set<string>>();

    activate(sessionId: string, skillId: string): void {
        if (!this.active.has(sessionId)) {
            this.active.set(sessionId, new Set());
        }
        this.active.get(sessionId)!.add(skillId);
    }

    isActive(sessionId: string, skillId: string): boolean {
        return this.active.get(sessionId)?.has(skillId) ?? false;
    }

    list(sessionId: string): string[] {
        return Array.from(this.active.get(sessionId) ?? []);
    }
}
