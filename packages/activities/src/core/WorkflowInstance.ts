import { Injectable, Refs } from '@tsdi/ioc';
import { Service, Startup, CTX_DATA } from '@tsdi/boot';
import { IActivity } from './IActivity';
import { ActivityContext } from './ActivityContext';
import { ActivityStatus } from './ActivityStatus';
import { Activity } from './Activity';
import { ComponentBuilderToken } from '@tsdi/components';

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

    private _status: ActivityStatus
    get status(): ActivityStatus {
        return this._status;
    }

    async onInit(): Promise<void> {
        let mgr = this.context.getConfigureManager();
        await mgr.getConfig();
    }

    getActivity(): IActivity {
        let injector = this.getInjector();
        return injector.get(ComponentBuilderToken).getComponentRef(this.getBoot(), injector) as IActivity;
    }

    async start(data?: any): Promise<TCtx> {
        let container = this.getContainer();
        this.context.set(CTX_DATA, data);
        this._status = this.getInjector().get(ActivityStatus);
        this.context.set(WorkflowInstance, this);
        if (this.context.id && !container.has(this.context.id)) {
            container.registerValue(this.context.id, this);
        }

        let target = this.getActivity();
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
