import { Injectable, Refs } from '@tsdi/ioc';
import { Service, Startup, CTX_DATA } from '@tsdi/boot';
import { IActivity } from './IActivity';
import { ActivityContext } from './ActivityContext';
import { ActivityStatus } from './ActivityStatus';
import { Activity } from './Activity';

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
@Refs(Activity, Startup)
@Refs('@Task', Startup)
export class WorkflowInstance<T extends IActivity<TCtx> = IActivity, TCtx extends ActivityContext = ActivityContext> extends Service<T, TCtx> {


    private _result: any;
    get result(): any {
        return this._result;
    }

    state: RunState;

    async start(data?: any): Promise<TCtx> {
        let injector = this.getInjector();
        this.context.set(CTX_DATA, data);
        this.context.set(ActivityStatus, this.getInjector().get(ActivityStatus));
        this.context.set(WorkflowInstance, this);
        if (this.context.id && !injector.has(this.context.id)) {
            injector.registerValue(this.context.id, this);
        }

        let target = this.context.activity;
        await target.run(this.context, async () => {
            this.state = RunState.complete;
            this._result = this.context.result;
        })

        return this.context;

    }

    async stop(): Promise<any> {
        this.state = RunState.stop;
    }

    async pause(): Promise<any> {
        this.state = RunState.pause;
    }

}
