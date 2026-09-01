import { token } from '@tsdi/ioc';

/**
 * Host-neutral cancellation/staleness seam for command execution.
 *
 * UI state depends only on this port. The in-memory implementation is the
 * default for local TUI/browser hosts; a remote host may replace it with an
 * RPC-backed implementation without changing command or renderer code.
 */
export interface CommandExecutionControlPort {
    begin(requestId: string, sessionId: string): AbortSignal | undefined;
    signal(requestId: string, sessionId: string): AbortSignal | undefined;
    isCurrent(requestId: string, sessionId: string): boolean;
    finish(requestId: string): void;
    cancel(requestId: string): void;
    cancelSession(sessionId: string): void;
}

export const COMMAND_EXECUTION_CONTROL = token<CommandExecutionControlPort>('COMMAND_EXECUTION_CONTROL');

interface CommandExecutionLease {
    sessionId: string;
    controller: AbortController;
}

/** Cross-platform reference implementation; only this class touches AbortController. */
export class InMemoryCommandExecutionControl implements CommandExecutionControlPort {
    protected leases = new Map<string, CommandExecutionLease>();

    begin(requestId: string, sessionId: string): AbortSignal | undefined {
        const controller = new AbortController();
        this.leases.set(requestId, { sessionId, controller });
        return controller.signal;
    }

    isCurrent(requestId: string, sessionId: string): boolean {
        const lease = this.leases.get(requestId);
        return !!lease && lease.sessionId === sessionId && !lease.controller.signal.aborted;
    }

    signal(requestId: string, sessionId: string): AbortSignal | undefined {
        const lease = this.leases.get(requestId);
        return lease?.sessionId === sessionId ? lease.controller.signal : undefined;
    }

    finish(requestId: string): void {
        this.leases.delete(requestId);
    }

    cancel(requestId: string): void {
        const lease = this.leases.get(requestId);
        if (!lease) return;
        lease.controller.abort();
        this.leases.delete(requestId);
    }

    cancelSession(sessionId: string): void {
        for (const [requestId, lease] of this.leases) {
            if (lease.sessionId === sessionId) this.cancel(requestId);
        }
    }
}
