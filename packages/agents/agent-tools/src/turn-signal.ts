import { AgentToolContext, CANCELLED_MESSAGE } from '@tsdi/agent';

/**
 * Run a tool's own work and report a user interrupt (Esc) with the wording every
 * tool shares.
 *
 * Tools forward `context.signal` to whatever they call (child processes, network
 * requests, host adapters), so an adapter that can abort its work stops it; for
 * adapters without a cancellation hook the coordinator stops waiting instead.
 */
export async function withTurnSignal<T>(context: AgentToolContext, run: () => Promise<T>): Promise<T> {
    try {
        return await run();
    } catch (error) {
        if (context?.signal?.aborted) {
            throw new Error(CANCELLED_MESSAGE);
        }
        throw error;
    }
}
