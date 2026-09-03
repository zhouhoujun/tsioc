import { Injectable } from '@tsdi/ioc';
import { ToolActivationStore } from './ToolActivationStore';

/** Session-scoped activation state; intentionally non-persistent and reset per host session. */
@Injectable()
export class SessionToolActivationStore extends ToolActivationStore {
    private activations = new Map<string, Set<string>>();
    activate(sessionId: string, name: string): void {
        const current = this.activations.get(sessionId) ?? new Set<string>();
        current.add(name);
        this.activations.set(sessionId, current);
    }
    isActive(sessionId: string, name: string): boolean {
        return this.activations.get(sessionId)?.has(name) ?? false;
    }
    getActive(sessionId: string): string[] {
        return Array.from(this.activations.get(sessionId) ?? []);
    }
}
