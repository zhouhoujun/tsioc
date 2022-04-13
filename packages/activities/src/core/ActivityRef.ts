import { Abstract } from '@tsdi/ioc';
import { ComponentRef } from '@tsdi/components';


/**
 *run state.
 *
 * @export
 * @enum {number}
 */
 export enum RunState {
    /**
     * activity init.
     */
    init,
    /**
     * runing.
     */
    running,
    /**
     * activity parused.
     */
    pause,
    /**
     * activity stopped.
     */
    stop,
    /**
     * activity complete.
     */
    complete
}


@Abstract()
export abstract class ActivityRef<T = any> extends ComponentRef<T> {
    abstract get result(): any;

    abstract state: RunState;

    abstract run(data?: any): Promise<void>;

    abstract stop(): Promise<void>;

    abstract pause(): Promise<void>;
}