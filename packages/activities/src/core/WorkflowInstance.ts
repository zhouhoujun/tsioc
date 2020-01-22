import { Injectable, Refs, isDefined, tokenId } from '@tsdi/ioc';
import { Service, Startup, BootContext, CTX_MODULE_STARTUP } from '@tsdi/boot';
import { IActivityRef, ACTIVITY_INPUT, ACTIVITY_OUTPUT } from './IActivityRef';
import { Activity } from './Activity';
import { ActivityOption } from './ActivityOption';
import { ActivityMetadata } from './ActivityMetadata';
import { ActivityStatus } from './ActivityStatus';
import { ActivityRef } from './ActivityRef';




/**
 * each body token.
 */
export const CTX_CURR_ACT_REF = tokenId<any>('CTX_CURR_ACT_REF');
/**
 * each body token.
 */
export const CTX_CURR_ACTSCOPE_REF = tokenId<any>('CTX_CURR_ACTSCOPE_REF');

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
export const WorkflowContextToken = tokenId<WorkflowContext>('WorkflowContext');

export const CTX_ACTIVITYSTATUS = tokenId<ActivityStatus>('CTX_ACTIVITYSTATUS');

@Injectable
@Refs(Activity, BootContext)
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

    get result() {
        return this.getValue(ACTIVITY_OUTPUT);
    }

    get startup(): WorkflowInstance {
        return this.getValue(CTX_MODULE_STARTUP) as WorkflowInstance;
    }


    get status(): ActivityStatus {
        if (!this.hasValue(CTX_ACTIVITYSTATUS)) {
            this.setValue(CTX_ACTIVITYSTATUS, this.injector.get(ActivityStatus));
        }
        return this.getValue(CTX_ACTIVITYSTATUS);
    }

    setOptions(options: ActivityOption) {
        if (!options) {
            return this;
        }
        if (isDefined(options.data)) {
            this.setValue(ACTIVITY_INPUT, options.data);
        }
        return super.setOptions(options);
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
@Refs(ActivityRef, Startup)
export class WorkflowInstance<T extends IActivityRef<TCtx> = IActivityRef, TCtx extends WorkflowContext = WorkflowContext> extends Service<T, TCtx> {

    private _result: any;
    get result(): any {
        return this._result;
    }

    state: RunState;

    async start(data?: any): Promise<TCtx> {
        let injector = this.getInjector();
        if (isDefined(data)) {
            this.context.setValue(ACTIVITY_INPUT, data);
        }
        this.context.setValue(WorkflowInstance, this);

        if (this.context.id && !injector.has(this.context.id)) {
            injector.setValue(this.context.id, this);
        }

        let target = this.getBoot() as IActivityRef;
        await target.run(this.context, async () => {
            this.state = RunState.complete;
            this.context.setValue(ACTIVITY_OUTPUT, target.context.output);
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
