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
}

export interface ActivityResult<T = any> {
    success: boolean;
    data?: T;
    error?: Error;
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
