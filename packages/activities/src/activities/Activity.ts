import { Abstract } from '@tsdi/ioc';

export interface ActivityContext {

}

/** Short status line a visual host can show for a node. */
export interface ActivityNodeStatus {
    /** Human readable fallback (`HTTP 200`, `Route 3`, `tcp 10.0.0.5:4711`). */
    text: string;
    level?: 'info' | 'success' | 'warn' | 'error';
    /** Translation key when the text is UI copy rather than data. */
    key?: string;
    /** Parameters for {@link key}. */
    params?: Record<string, any>;
    /** Node-RED status indicator shape; hosts paint a dot or a hollow ring. */
    shape?: 'dot' | 'ring';
    /** Node-RED status fill (colour name or CSS colour). */
    fill?: string;
}

export interface ActivityResult<T = any> {
    success: boolean;
    data?: T;
    error?: Error;
    /**
     * Stop the branch without failing: outgoing edges are marked skipped (the
     * Node-RED "do not send the message" behaviour, e.g. range drop).
     */
    drop?: boolean;
    /**
     * Last status reported by the activity. Visual hosts show it on the node
     * (the Node-RED `node.status()` equivalent); it is not part of the payload.
     */
    status?: ActivityNodeStatus;
}

@Abstract()
export abstract class Activity {

    abstract execute(context: ActivityContext): Promise<ActivityResult>;

    compensate?(context: ActivityContext): Promise<void>;

}
