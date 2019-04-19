import { Service, Runnable } from '@tsdi/boot';
import { Joinpoint } from '@tsdi/aop';
import { Injectable, Refs } from '@tsdi/ioc';
import { Activity } from './Activity';
import { ActivityContext } from './ActivityContext';
import { ActivityConfigure } from './ActivityConfigure';

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

/**
 * task runner.
 *
 * @export
 * @class TaskRunner
 * @implements {ITaskRunner}
 */
@Injectable
@Refs(Activity, Runnable)
@Refs('@Task', Runnable)
export class WorkflowInstance<T extends ActivityContext> extends Service<Activity<T>> {

    protected _ctx: T;
    get context(): T {
        return this._ctx;
    }

    private _result: any;
    get result(): any {
        return this._result;
    }


    state: RunState;


    async onInit(): Promise<void> {
        let mgr = this.context.getConfigureManager<ActivityConfigure<T>>();
        await mgr.getConfig();
    }

    run(data?: any): Promise<T> {
        return this.start(data);
    }

    async start(data?: any): Promise<T> {
        if (this.context.id && !this.container.has(this.context.id)) {
            this.container.bindProvider(this.context.id, this);
        }

        await this.getTarget().execute(this.context, async () => {
            this.state = RunState.complete;
            this._result = this.context.data;
        })

        return this.context;

    }

    _currState: Joinpoint;
    saveState(state: Joinpoint) {
        this._currState = state;
    }

    async stop(): Promise<any> {
        this.state = RunState.stop;
    }

    async pause(): Promise<any> {
        this.state = RunState.pause;
    }

}
