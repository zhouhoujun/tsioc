import { Inject, Express, ContainerToken, IContainer, Token, ProviderType, lang, InjectReference } from '@ts-ioc/core';
import { Task } from '../decorators';
import { IActivity, ActivityToken } from './IActivity';
import { ActivityConfigure, ExpressionType, Expression, ActivityType } from './ActivityConfigure';
import { OnActivityInit } from './OnActivityInit';
import { ActivityContext, ActivityContextToken } from './ActivityContext';
import { IActivityContext, InputDataToken, InjectActivityContextToken } from './IActivityContext';

/**
 * activity base.
 *
 * @export
 * @abstract
 * @class ActivityBase
 * @implements {IActivity}
 * @implements {OnActivityInit}
 */
@Task
export abstract class Activity implements IActivity, OnActivityInit {
    @Inject(ContainerToken)
    private container: IContainer;

    protected _ctx: IActivityContext;

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
     * @memberof Activity
     */
    name: string;
    /**
     * config.
     *
     * @type {ActivityConfigure}
     * @memberof Activity
     */
    config: ActivityConfigure;

    constructor() {

    }

    /**
     * get container.
     *
     * @returns {IContainer}
     * @memberof ActivityBase
     */
    getContainer(): IContainer {
        return this.container;
    }

    /**
     * create activity context.
     *
     * @template T
     * @param {*} [data]
     * @param {Token<IActivity>} [type]
     * @param {Token<T>} [defCtx]
     * @returns {T}
     * @memberof ContextFactory
     */
    createContext<T extends IActivityContext>(data?: any, type?: Token<IActivity>, defCtx?: Token<T>): T {
        let provider = { provide: InputDataToken, useValue: data } as ProviderType;
        type = type || lang.getClass(this);
        if (this.config && this.config.contextType) {
            return this.container.resolve(this.config.contextType, provider) as T;
        }

        return this.container.getRefService(
            tk => [new InjectActivityContextToken(tk), new InjectReference(ActivityContextToken, tk)],
            type,
            defCtx || ActivityContextToken, provider) as T;
    }

    /**
     *  activity execute context.
     *
     * @type {IActivityContext}
     * @memberof Activity
     */
    getContext(): IActivityContext {
        if (!this._ctx) {
            this._ctx = this.createContext();
        }
        return this._ctx;
    }


    async onActivityInit(config: ActivityConfigure) {
        this.config = config;
    }

    /**
     * run activity.
     *
     * @param {IActivityContext} [ctx]
     * @returns {Promise<IActivityContext>}
     * @memberof ObjectActivity
     */
    async run(ctx?: IActivityContext): Promise<IActivityContext> {
        this.verifyCtx(ctx);
        await this.execute();
        return this.getContext();
    }

    /**
     * execute activity.
     *
     * @protected
     * @abstract
     * @returns {Promise<void>}
     * @memberof Activity
     */
    protected abstract execute(): Promise<void>;

    /**
     * verify context.
     *
     * @protected
     * @param {*} [ctx]
     * @returns {ActivityContext}
     * @memberof Activity
     */
    protected verifyCtx(ctx?: any) {
        if (ctx instanceof ActivityContext) {
            this._ctx = ctx;
        } else {
            this.getContext().setAsResult(ctx);
        }
    }

    /**
     * convert to expression
     *
     * @protected
     * @template T
     * @param {ExpressionType<T>} exptype
     * @param {IActivity} [target]
     * @returns {Promise<Expression<T>>}
     * @memberof Activity
     */
    protected toExpression<T>(exptype: ExpressionType<T>, target?: IActivity): Promise<Expression<T>> {
        return this.getContext().getBuilder().toExpression(exptype, target || this);
    }

    /**
     * convert to activity.
     *
     * @protected
     * @template Tr
     * @template Ta
     * @template TCfg
     * @param {(ExpressionType<Tr> | ActivityType<Ta>)} exptype
     * @param {Express<any, boolean>} isRightActivity
     * @param {Express<Tr, TCfg>} toConfig
     * @param {Express<TCfg, TCfg>} [valify]
     * @param {IActivity} [target]
     * @returns {Promise<Ta>}
     * @memberof Activity
     */
    protected toActivity<Tr, Ta extends IActivity, TCfg extends ActivityConfigure>(
        exptype: ExpressionType<Tr> | ActivityType<Ta>,
        isRightActivity: Express<any, boolean>,
        toConfig: Express<Tr, TCfg>,
        valify?: Express<TCfg, TCfg>,
        target?: IActivity): Promise<Ta> {
        return this.getContext().getBuilder().toActivity<Tr, Ta, TCfg>(exptype, target || this, isRightActivity, toConfig, valify);
    }

    protected buildActivity<T extends IActivity>(config: ActivityType<T>): Promise<T> {
        return this.getContext().getBuilder().buildByConfig(config, this.id) as Promise<T>;
    }

}



/**
 * null activity. do nothing.
 *
 * @export
 * @class NullActivity
 * @extends {Activity}
 */
@Task(ActivityToken)
export class NullActivity extends Activity {

    protected async execute(): Promise<void> {

    }
}
