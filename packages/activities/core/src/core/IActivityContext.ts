import { InjectToken, Registration, Token, IContainer, ObjectMap, Type, RefRegistration } from '@ts-ioc/core';
import { IActivity } from './IActivity';
import { ActivityConfigure, Expression } from './ActivityConfigure';
import { ActivityBuilder } from './ActivityBuilder';


/**
 * task context.
 *
 * @export
 * @interface IContext
 */
export interface IContext {

    /**
     * get ioc container.
     *
     * @returns {IContainer}
     * @memberof IContext
     */
    getContainer(): IContainer;

    /**
     * default builder.
     *
     * @type {ActivityBuilder}
     * @memberof IContext
     */
    getBuilder(): ActivityBuilder;

    /**
     * get base URL.
     *
     * @returns {string}
     * @memberof IContext
     */
    getRootPath(): string;

    /**
     * get task evn args.
     *
     * @returns {ObjectMap<any>}
     * @memberof IContext
     */
    getEnvArgs(): ObjectMap<any>;

    /**
     *convert to finally type via context.
     *
     * @template T
     * @param {CtxType<T>} target
     * @param {ActivityConfigure} [config]
     * @returns {T}
     * @memberof IContext
     */
    to<T>(target: CtxType<T>, config?: ActivityConfigure): T;

    /**
     * exec activity result.
     *
     * @template T
     * @param {IActivity} target
     * @param {Expression<T>} expression
     * @param {ActivityContext} [ctx]
     * @returns {Promise<T>}
     * @memberof IContext
     */
    exec<T>(target: IActivity, expression: Expression<T>, ctx?: IActivityContext): Promise<T>;

    /**
     * check is task or not.
     *
     * @param {Type<IActivity>} task
     * @returns {boolean}
     * @memberof IContext
     */
    isTask(task: Type<IActivity>): boolean;
}

/**
 * context type.
 */
export type CtxType<T> = T | ((context?: IContext, config?: ActivityConfigure) => T);


/**
 * activity run context.
 *
 * @export
 * @interface IActivityContext
 */
export interface IActivityContext extends IContext {
    /**
     * input data
     *
     * @type {*}
     * @memberof IRunContext
     */
    input: any;

    /**
     * execute activity.
     *
     * @type {IActivity}
     * @memberof IRunContext
     */
    execute?: IActivity;

    /**
     * target activiy.
     *
     * @type {IActivity}
     * @memberof ActivityContext
     */
    target?: IActivity;

    /**
     * ge activity execute result.
     *
     * @returns {*}
     * @memberof IActivityContext
     */
    result: any;

    /**
     * set the data as result.
     *
     * @param {*} data
     * @memberof IActivityContext
     */
    setAsResult(data: any);
}

/**
 * inpit data token.
 */
export const InputDataToken = new InjectToken<any>('Context_Inputdata');

/**
 * activity context.
 *
 * @export
 * @interface IActivityContextResult
 * @extends {IActivityContext}
 * @template T
 */
export interface IActivityContextResult<T> extends IActivityContext {
    /**
     * ge activity execute result.
     *
     * @returns {T}
     * @memberof IActivityContext
     */
    result: T;
}

/**
 * inject actitiy context token.
 *
 * @export
 * @class InjectActivityContextToken
 * @extends {Registration<IActivityContext<any>>}
 */
export class InjectActivityContextToken extends RefRegistration<IActivityContext> {
    constructor(type: Token<IActivity>) {
        super(type, 'Activity_Context');
    }
}
