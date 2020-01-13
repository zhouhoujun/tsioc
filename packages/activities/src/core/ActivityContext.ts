import { Injectable, Type, Refs, InjectToken, createRaiseContext, isToken, IInjector } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { BootContext } from '@tsdi/boot';
import { COMPONENT_REFS } from '@tsdi/components';
import { ActivityExecutor } from './ActivityExecutor';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { WorkflowInstance } from './WorkflowInstance';
import { ActivityMetadata, Expression } from './ActivityMetadata';
import { IActivityRef, ActivityResult } from './IActivityRef';

/**
 * workflow context token.
 */
export const WorkflowContextToken = new InjectToken<ActivityContext>('WorkflowContext');

/**
 * each body token.
 */
export const CTX_CURR_ACT_REF = new InjectToken<any>('CTX_CURR_ACT_REF');
/**
 * each body token.
 */
export const CTX_CURR_ACTSCOPE_REF = new InjectToken<any>('CTX_CURR_ACTSCOPE_REF');


/**
 * activity execute context.
 *
 * @export
 * @class ActivityContext
 */
@Injectable
@Refs(Activity, BootContext)
@Refs('@Task', BootContext)
export class ActivityContext extends BootContext<ActivityOption, ActivityMetadata> {

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
    runnable: WorkflowInstance;

    get result(): any {
        return this.get(ActivityResult);
    }

    private _status: ActivityStatus;
    get status(): ActivityStatus {
        if (!this._status) {
            this._status = this.injector.get(ActivityStatus, { provide: ActivityContext, useValue: this });
        }
        return this._status;
    }

    static parse(injector: IInjector, target: Type | ActivityOption): ActivityContext {
        return createRaiseContext(injector, ActivityContext, isToken(target) ? { module: target } : target);
    }

    private _executor: ActivityExecutor;
    getExector(): ActivityExecutor {
        if (!this._executor) {
            this._executor = this.injector.get(ActivityExecutor, { provide: ActivityContext, useValue: this });
        }
        return this._executor;
    }


    resolveExpression<TVal>(express: Expression<TVal>, container?: IContainer): Promise<TVal> {
        return this.getExector().resolveExpression(express, container);
    }

}



/**
 * activity status.
 *
 * @export
 * @class ActivityStatus
 */
@Injectable
export class ActivityStatus {

    constructor(private context: ActivityContext) {
    }

    get current(): IActivityRef {
        return this.context.get(CTX_CURR_ACT_REF);
    }

    get currentScope(): IActivityRef {
        return this.context.get(CTX_CURR_ACTSCOPE_REF);
    }

    set current(activity: IActivityRef) {
        if (activity) {
            this.context.set(CTX_CURR_ACT_REF, activity);
            if (activity.runScope) {
                this.context.set(CTX_CURR_ACTSCOPE_REF, activity);
            }
        }
    }
}
