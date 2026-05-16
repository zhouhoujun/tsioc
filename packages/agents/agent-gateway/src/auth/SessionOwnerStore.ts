import { Injectable } from '@tsdi/ioc';

@Injectable()
export class SessionOwnerStore {
    private owners = new Map<string, string>();

    create(sessionId: string, principalId?: string): void {
        if (!principalId) {
            return;
        }
        this.owners.set(sessionId, principalId);
    }

    getOwner(sessionId: string): string | undefined {
        return this.owners.get(sessionId);
    }

    hasOwner(sessionId: string): boolean {
        return this.owners.has(sessionId);
    }

    isOwner(sessionId: string, principalId?: string): boolean {
        if (!principalId) {
            return false;
        }
        return this.owners.get(sessionId) === principalId;
    }

    canResume(sessionId: string, principalId?: string): boolean {
        if (!principalId) {
            return false;
        }
        return this.owners.get(sessionId) === principalId;
    }

    listOwned(sessionIds: Iterable<string>, principalId?: string): string[] {
        if (!principalId) {
            return [];
        }
        return Array.from(sessionIds).filter(sessionId => this.owners.get(sessionId) === principalId);
    }

    listSessionIds(): string[] {
        return Array.from(this.owners.keys());
    }

    unbind(sessionId: string): void {
        this.owners.delete(sessionId);
    }

    clear(): void {
        this.owners.clear();
    }
}
