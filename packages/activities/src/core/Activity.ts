import {
    Inject, Express, Token, ProviderType, lang,
    Providers, isFunction, isToken, isBaseObject, isClass,
    Type, hasClassMetadata, getOwnTypeMetadata, isBoolean, isNullOrUndefined, enumerable
} from '@ts-ioc/ioc';
import { Task } from '../decorators/Task';
import { OnActivityInit } from './OnActivityInit';
import { IActivity,  WorkflowId } from './IActivity';
import { ActivityConfigure, ExpressionType, Expression, ActivityType, Active, ExpressionToken } from './ActivityConfigure';
import { IActivityContext, InputDataToken, InjectActivityContextToken, ActivityContextToken } from './IActivityContext';
import { IActivityMetadata } from '../metadatas';
import { ContainerToken, IContainer, ResolveServiceContext } from '@ts-ioc/core';
import { MetaAccessor } from '@ts-ioc/boot';
import { ActivityMetaAccessor } from './ActivityMetaAccessor';


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
@Providers([
    { provide: MetaAccessor, useClass: ActivityMetaAccessor }
])
export abstract class Activity implements IActivity, OnActivityInit {

    /**
     * get container.
     *
     * @returns {IContainer}
     * @memberof ActivityBase
     */
    @enumerable(false)
    @Inject(ContainerToken)
    container: IContainer;

    /**
     *  activity execute context.
     *
     * @type {IActivityContext}
     * @memberof Activity
     */
    @enumerable(false)
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
    private _config: ActivityConfigure;

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
    createContext(data?: any, type?: Token<IActivity> | boolean, defCtx?: Token<any> | boolean, subctx?: boolean): IActivityContext {
        if (isBoolean(type)) {
            subctx = type;
            defCtx = undefined;
            type = undefined;
        } else if (isBoolean(defCtx)) {
            subctx = defCtx;
            type = undefined;
        }

        let provider = { provide: InputDataToken, useValue: data } as ProviderType;
        type = type || lang.getClass(this);
        if (this._config && this._config.contextType) {
            return this.container.resolve(this._config.contextType, provider);
        }
        let cfgdefCtx = this._config ? this._config.baseContextType : null;
        let ctx = this.container.getService<IActivityContext>(ActivityContextToken,
            type as Token<any>,
            ResolveServiceContext.create({
                refTargetFactory: tk => new InjectActivityContextToken(tk),
                defaultToken: (defCtx || cfgdefCtx || ActivityContextToken) as Token<any>
            }),
            provider);
        if (cfgdefCtx) {
            let defType = this.container.getTokenImpl(cfgdefCtx);
            if (!(ctx instanceof defType)) {
                ctx = this.container.resolve(cfgdefCtx, provider);
            }
        }
        this.initContext(ctx);
        if (subctx === true) {
            ctx.parent = this.context;
        }
        return ctx;
    }

    protected initContext(ctx: IActivityContext) {
        ctx.config = this._config;
    }


    async onActivityInit(config: ActivityConfigure) {
        this._config = config;
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
        if (!this.context) {
            this.context = this.createContext();
        }
        this.context.setState(ctx, this._config);
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
    protected toExpression<T>(exptype: ExpressionType<T>, target?: IActivity, ctx?: IActivityContext): Promise<Expression<T>> {
        return (ctx || this.context).getBuilder().toExpression(exptype, target || this);
    }

    /**
     * resolve expression.
     *
     * @protected
     * @template T
     * @param {ExpressionType<T>} express
     * @param {IActivityContext} [ctx]
     * @returns {Promise<T>}
     * @memberof Activity
     */
    protected async resolveExpression<T>(express: ExpressionType<T>, ctx?: IActivityContext): Promise<T> {
        if (!this.context) {
            this.context = this.createContext();
        }
        let exp = await this.toExpression(express, this, ctx);
        if (exp) {
            return await (ctx || this.context).exec(this, exp);
        }
        return null;
    }

    /**
    * execute activity.
    *
    * @param {IActivity} activity
    * @param {IActivityContext} ctx
    * @param {any} [data]
    * @returns
    * @memberof Activity
    */
    protected async execActivity(activity: Activity | Active | ExpressionToken<any>, ctx: IActivityContext | (() => IActivityContext), data?: any): Promise<IActivityContext> {
        if (!activity) {
            return null;
        }
        let rctx = isFunction(ctx) ? ctx() : ctx;
        if (activity instanceof Activity) {
            return await this.runActivity(activity, rctx, data);
        } else {
            let act = activity;
            if (!isToken(activity) && isFunction(activity)) {
                act = await activity(rctx);
            }
            let at;
            if (isToken(act)) {
                at = await this.buildActivity(act);
            } else if (isBaseObject(act)) {
                this.vaildExecAcitve(act);
                at = await this.buildActivity(act);
            }

            if (at && at instanceof Activity) {
                return await this.runActivity(at, rctx, data);
            }

        }
        console.error('execute activity is not vaild activity:', activity);
        throw new Error('execActivity activity param is not vaild.');
    }

    protected runActivity(activity: Activity, ctx: IActivityContext, data?: any) {
        if (!isNullOrUndefined(data)) {
            ctx.setAsResult(data);
        }
        return activity.run(ctx);
    }

    protected vaildExecAcitve(config: ActivityConfigure) {

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
 * is acitivty instance or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Activity}
 */
export function isAcitvity(target: any): target is Activity {
    return target instanceof Activity;
}

/**
 * target is activity class.
 *
 * @export
 * @param {*} target
 * @returns {target is Type<IActivity>}
 */
export function isAcitvityClass(target: any, ext?: (meta: IActivityMetadata) => boolean): target is Type<IActivity> {
    if (!isClass(target)) {
        return false;
    }
    if (hasClassMetadata(Task, target)) {
        if (ext) {
            return getOwnTypeMetadata(Task, target).some(meta => meta && ext(meta));
        }
        return true;
    }
    return false;
}
