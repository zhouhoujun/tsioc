import { Injectable } from '@tsdi/ioc';

/**
 * Stable action channel between the management menu and the designer shell.
 *
 * Function attributes on deeply re-rendered children can be replaced; the bus
 * is a singleton provider so menu actions keep reaching the current designer
 * instance after tab/theme/layout updates.
 */
@Injectable()
export class WorkflowActionBus {
    private readonly listeners = new Set<(action: string) => void>();

    emit(action: string): void {
        for (const listener of [...this.listeners]) {
            listener(action);
        }
    }

    subscribe(listener: (action: string) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

/** Shared singleton action channel. */
export const WORKFLOW_ACTION_BUS = new WorkflowActionBus();
