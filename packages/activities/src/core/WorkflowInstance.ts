import { Injectable, Refs } from '@tsdi/ioc';
import { Service, Startup, CTX_DATA } from '@tsdi/boot';
import { Activity } from './Activity';
import { ActivityContext } from './ActivityContext';
import { ActivityStatus } from './ActivityStatus';

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
export class WorkflowInstance<T extends Activity = Activity, TCtx extends ActivityContext = ActivityContext> extends Service<T, TCtx> {


    private _result: any;
    get result(): any {
        return this._result;
    }

    state: RunState;

    private _status: ActivityStatus
    get status(): ActivityStatus {
        return this._status;
    }

    async onInit(): Promise<void> {
        let mgr = this.context.getConfigureManager();
        await mgr.getConfig();
    }

    async start(data?: any): Promise<TCtx> {
        let container = this.getContainer();
        this.context.set(CTX_DATA, data);
        this._status = container.get(ActivityStatus);
        this.context.set(WorkflowInstance, this);
        if (this.context.id && !container.has(this.context.id)) {
            container.bindProvider(this.context.id, this);
        }
        let target = this.getBootNode();
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
