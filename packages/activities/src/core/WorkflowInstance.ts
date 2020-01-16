import { Injectable, Refs, InjectToken, isDefined } from '@tsdi/ioc';
import { Service, Startup, BootContext } from '@tsdi/boot';
import { IActivityRef, ACTIVITY_INPUT, ACTIVITY_OUTPUT } from './IActivityRef';
import { Activity } from './Activity';
import { ActivityOption } from './ActivityOption';
import { ActivityMetadata } from './ActivityMetadata';
import { ActivityStatus } from './ActivityStatus';




/**
 * each body token.
 */
export const CTX_CURR_ACT_REF = new InjectToken<any>('CTX_CURR_ACT_REF');
/**
 * each body token.
 */
export const CTX_CURR_ACTSCOPE_REF = new InjectToken<any>('CTX_CURR_ACTSCOPE_REF');

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
 * workflow context token.
 */
export const WorkflowContextToken = new InjectToken<WorkflowContext>('WorkflowContext');


@Injectable
@Refs(Activity, BootContext)
@Refs('@Task', BootContext)
export class WorkflowContext extends BootContext<ActivityOption, ActivityMetadata> {
    /**
    * workflow id.
    *
    * @type {string}
    * @memberof ActivityContext
    */
    id: string;
    /**
    * action name.
    *
    * @type {string}
    * @memberof ActivityOption
    */
    name: string;
    /**
     * bootstrap runnable service.
     *
     * @type {WorkflowInstance}
     * @memberof BootContext
     */
    startup: WorkflowInstance;

    get result() {
        return this.get(ACTIVITY_OUTPUT);
    }

    private _status: ActivityStatus;
    get status(): ActivityStatus {
        if (!this._status) {
            this._status = this.injector.get(ActivityStatus);
        }
        return this._status;
    }

    setOptions(options: ActivityOption) {
        if (!options) {
            return;
        }
        super.setOptions(options);
        if (isDefined(options.data)) {
            this.set(ACTIVITY_INPUT, options.data);
        }
    }
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
export class WorkflowInstance<T extends IActivityRef<TCtx> = IActivityRef, TCtx extends WorkflowContext = WorkflowContext> extends Service<T, TCtx> {


    private _result: any;
    get result(): any {
        return this._result;
    }

    state: RunState;

    async start(data?: any): Promise<TCtx> {
        let injector = this.getInjector();
        if (isDefined(data)) {
            this.context.set(ACTIVITY_INPUT, data);
        }
        this.context.set(WorkflowInstance, this);

        if (this.context.id && !injector.has(this.context.id)) {
            injector.registerValue(this.context.id, this);
        }

        let target = this.getBoot() as IActivityRef;
        await target.run(this.context, async () => {
            this.state = RunState.complete;
            this.context.set(ACTIVITY_OUTPUT, target.context.output);
        });

        return this.context;

    }

    async stop(): Promise<any> {
        this.state = RunState.stop;
    }

    async pause(): Promise<any> {
        this.state = RunState.pause;
    }

}
