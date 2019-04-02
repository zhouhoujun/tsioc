import { ActivityConfigure } from './ActivityConfigure';
import { OnActivityInit } from './OnActivityInit';
import { InjectToken } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { ActivityContext } from './ActivityContext';


export const WorkflowId = new InjectToken<string>('Workflow_ID');



/**
 * activity instance.
 */
export type ActivityInstance = IActivity & OnActivityInit;

/**
 * activity object.
 *
 * @export
 * @interface IActivity
 */
export interface IActivity {
    /**
     * activity display name.
     *
     * @type {string}
     * @memberof IActivity
     */
    name: string;

    /**
     * task init.
     *
     * @param {ActivityConfigure} config
     * @returns {Promise<void>}
     * @memberof IActivity
     */
    onActivityInit(config: ActivityConfigure): Promise<void>;
}

/**
 * typed result activity.
 *
 * @export
 * @interface IActivityResult
 * @template T
 */
export interface IActivityResult<T> extends IActivity {
    /**
     * task execute context.
     *
     * @type {IContext}
     * @memberof IActivityResult
     */
    readonly context: ActivityContext<T>;
    /**
     * run activity.
     *
     * @param {IActivityContext} [ctx]
     * @returns {Promise<IActivityContextResult<T>>}
     * @memberof IActivityResult
     */
    run(ctx?: ActivityContext<T>): Promise<ActivityContext<T>>;
}

