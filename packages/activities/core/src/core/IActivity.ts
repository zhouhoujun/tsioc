import { ActivityConfigure } from './ActivityConfigure';
import { OnActivityInit } from './OnActivityInit';
import { IActivityContext, IActivityContextResult } from './IActivityContext';
import { Registration, IContainer, Token, InjectToken } from '@ts-ioc/core';
import { InjectAnnoBuildStrategyToken } from '@ts-ioc/bootstrap';

/**
 * Inject AcitityToken
 *
 * @export
 * @class InjectAcitityToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectAcitityToken<T extends IActivity> extends Registration<T> {
    constructor(desc: string) {
        super('Activity', desc);
    }
}

export const WorkflowId = new InjectToken<string>('Workflow_ID');

/**
 * task token.
 */
export const ActivityToken = new InjectAcitityToken<IActivity>('');



/**
 *  activity build strategy token.
 */
export const ActivityBuildStrategyToken = new InjectAnnoBuildStrategyToken(ActivityToken);

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
     * workflow instance uuid.
     *
     * @type {string}
     * @memberof IActivity
     */
    readonly id: string;

    /**
     * activity display name.
     *
     * @type {string}
     * @memberof IActivity
     */
    name: string;

    /**
     * task execute context.
     *
     * @type {IContext}
     * @memberof IActivity
     */
    context: IActivityContext;

    /**
     * get ioc container.
     *
     * @returns {IContainer}
     * @memberof IContext
     */
    container: IContainer;

    /**
     * create context.
     *
     * @param {*} [data]
     * @param {Token<IActivity>} [type]
     * @param {Token<T>} [defCtx]
     * @returns {T}
     * @memberof IActivity
     */
    createContext(data?: any, type?: Token<IActivity>, defCtx?: Token<any>): IActivityContext

    // /**
    //  * config.
    //  *
    //  * @type {ActivityConfigure}
    //  * @memberof IActivity
    //  */
    // config: ActivityConfigure;

    /**
     * run task.
     *
     * @param {IActivityContext} [ctx]
     * @returns {Promise<any>}
     * @memberof IActivityObject
     */
    run(ctx?: IActivityContext): Promise<IActivityContext>;

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
    readonly context: IActivityContextResult<T>;
    /**
     * run activity.
     *
     * @param {IActivityContext} [ctx]
     * @returns {Promise<IActivityContextResult<T>>}
     * @memberof IActivityResult
     */
    run(ctx?: IActivityContext): Promise<IActivityContextResult<T>>;
}

