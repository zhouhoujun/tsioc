import { ActivityConfigure } from './ActivityConfigure';
import { OnActivityInit } from './OnActivityInit';
import { IActivityContext, IActivityContextResult } from './IActivityContext';
import { Registration, Token, InjectToken } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';

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
     * @returns {IActivityContext}
     * @memberof IActivity
     */
    createContext(): IActivityContext;

    /**
     * create context with init data.
     *
     * @param {*} data
     * @returns {IActivityContext}
     * @memberof IActivity
     */
    createContext(data: any): IActivityContext;

    /**
     * create context or child context.
     *
     * @param {*} data init data.
     * @param {boolean} subctx create child context or not.
     * @returns {IActivityContext}
     * @memberof IActivity
     */
    createContext(data: any, subctx: boolean): IActivityContext;
    /**
     * create context of type target.
     *
     * @param {*} data init data.
     * @param {Token<IActivity>} type context of target type.
     * @param {boolean} [subctx] create child context or not.
     * @memberof IActivity
     */
    createContext(data: any, type: Token<IActivity>, subctx?: boolean);

    /**
     * create context of type target. default with create `defCtx`.
     *
     * @param {*} data init data.
     * @param {Token<IActivity>} type context of target type.
     * @param {Token<any>} defCtx can't find context match target type, will create as default context.
     * @param {boolean} [subctx] create child context or not.
     * @returns {IActivityContext}
     * @memberof IActivity
     */
    createContext(data: any, type: Token<IActivity>, defCtx: Token<any>, subctx?: boolean): IActivityContext;

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

