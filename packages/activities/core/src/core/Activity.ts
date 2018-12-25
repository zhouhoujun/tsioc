import {
    Inject, Express, ContainerToken, IContainer, Token, ProviderType, lang,
    Providers, MetaAccessorToken, isFunction, isToken, isBaseObject
} from '@ts-ioc/core';
import { Task } from '../decorators';
import { OnActivityInit } from './OnActivityInit';
import { ActivityContext } from './ActivityContext';
import { ActivityMetaAccessorToken } from '../injectors';
import { IActivity, ActivityToken, WorkflowId } from './IActivity';
import { ActivityConfigure, ExpressionType, Expression, ActivityType, Active } from './ActivityConfigure';
import { IActivityContext, InputDataToken, InjectActivityContextToken, ActivityContextToken } from './IActivityContext';
import { IWorkflowInstance } from './IWorkflowInstance';


/**
 * activity base.
 *
 * @export
 * @abstract
 * @class ActivityBase
 * @implements {IActivity}
 * @implements {OnActivityInit}
 */
@Task(ActivityToken)
@Providers([
    { provide: MetaAccessorToken, useExisting: ActivityMetaAccessorToken }
])
export abstract class Activity implements IActivity, OnActivityInit {

    /**
     * get container.
     *
     * @returns {IContainer}
     * @memberof ActivityBase
     */
    @Inject(ContainerToken)
    container: IContainer;

    /**
     *  activity execute context.
     *
     * @type {IActivityContext}
     * @memberof Activity
     */
    context: IActivityContext;

    /**
     * workflow instance uuid.
     *
     * @type {string}
     * @memberof IActivity
     */
    get id(): string {
        return this.container.get(WorkflowId);
    }
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
     * create activity context.
     *
     * @param {*} [data]
     * @param {Token<IActivity>} [type]
     * @param {Token<T>} [defCtx]
     * @returns {T}
     * @memberof ContextFactory
     */
    createContext(data?: any, type?: Token<IActivity>, defCtx?: Token<any>): IActivityContext {
        let provider = { provide: InputDataToken, useValue: data } as ProviderType;
        type = type || lang.getClass(this);
        if (this.config && this.config.contextType) {
            return this.container.resolve(this.config.contextType, provider);
        }
        let ctx = this.container.getService(ActivityContextToken, type,
            tk => new InjectActivityContextToken(tk),
            defCtx || ActivityContextToken, provider);
        if (this.config) {
            ctx.config = this.config;
        }
        return ctx;
    }


    async onActivityInit(config: ActivityConfigure) {
        this.config = config;
        if (!this.context) {
            this.context = this.createContext();
        }
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
        if (this.execute) {
            await this.execute();
        }
        return this.context;
    }

    protected async resolveExpression<T>(express: ExpressionType<T>): Promise<T> {
        if (!this.context) {
            this.context = this.createContext();
        }
        return await this.context.exec(this, await this.toExpression(express));
    }

    /**
     * execute activity.
     *
     * @param {IActivity} activity
     * @param {IActivityContext} ctx
     * @returns
     * @memberof Activity
     */
    protected async execActivity(activity: Activity | Active, ctx: IActivityContext | (() => IActivityContext)): Promise<IActivityContext> {
        if (!activity) {
            return null;
        }
        let rctx = isFunction(ctx) ? ctx() : ctx;
        if (activity instanceof Activity) {
            return await activity.run(rctx);
        } else if (isToken(activity) || isBaseObject(activity)) {
            let runner = await this.context.getBuilder().boot(activity, { target: this, data: rctx }) as IWorkflowInstance<any>;
            if (runner) {
                return runner.context;
            }
        }
        console.error('execute activity is not vaild activity:', activity);
        throw new Error('param is not vaild activity');
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
        if (this.isValidContext(ctx)) {
            this.context = ctx;
            if (this.config) {
                this.context.config = lang.assign({}, this.context.config, this.config);
            }
        } else {
            this.setResult(ctx);
        }
    }

    protected isValidContext(ctx: any): boolean {
        return ctx instanceof ActivityContext;
    }

    /**
     * set context result.
     *
     * @protected
     * @param {*} [ctx]
     * @memberof Activity
     */
    protected setResult(ctx?: any) {
        if (!this.context) {
            this.context = this.createContext(ctx);
        } else {
            this.context.setAsResult(ctx);
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
        return this.context.getBuilder().toExpression(exptype, target || this);
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
        return this.context.getBuilder().toActivity<Tr, Ta, TCfg>(exptype, target || this, isRightActivity, toConfig, valify);
    }

    protected buildActivity<T extends IActivity>(config: ActivityType<T>): Promise<T> {
        return this.context.getBuilder().buildActivity(config, this) as Promise<T>;
    }

}

/**
 * is acitivty or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Activity}
 */
export function isAcitvity(target: any): target is Activity {
    return target instanceof Activity;
}
