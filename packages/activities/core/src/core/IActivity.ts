import { Registration, IContainer } from '@ts-ioc/core';
import { ActivityConfigure } from './ActivityConfigure';
import { OnActivityInit } from './OnActivityInit';
import { IActivityContext, IActivityContextResult } from './IActivityContext';
import { ContextFactory } from './ContextFactory';

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
    id: string;

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
    getContext(): IActivityContext;

    /**
     * get ioc container.
     *
     * @returns {IContainer}
     * @memberof IContext
     */
    getContainer(): IContainer;

    /**
     * context factory.
     *
     * @type {ContextFactory}
     * @memberof Activity
     */
    getCtxFactory(): ContextFactory;

    /**
     * config.
     *
     * @type {ActivityConfigure}
     * @memberof IActivity
     */
    config: ActivityConfigure;

    /**
     * run task.
     *
     * @param {IActivityContext} [ctx]
     * @returns {Promise<any>}
     * @memberof IActivityObject
     */
    run(ctx?: IActivityContext): Promise<IActivityContext>;
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
    getContext(): IActivityContextResult<T>;
    /**
     * run activity.
     *
     * @param {IActivityContext} [ctx]
     * @returns {Promise<IActivityContextResult<T>>}
     * @memberof IActivityResult
     */
    run(ctx?: IActivityContext): Promise<IActivityContextResult<T>>;
}

