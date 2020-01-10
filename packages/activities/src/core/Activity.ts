import {
    isClass, Type, isNullOrUndefined, Abstract, PromiseUtil, Inject,
    InjectorProxyToken, InjectorProxy, isDefined
} from '@tsdi/ioc';
import { IContainer, ICoreInjector } from '@tsdi/core';
import { Input, ComponentBuilderToken } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext } from './ActivityContext';
import { IActivity, ActivityResult } from './IActivity';
import { ActivityMetadata, ActivityType, Expression } from './ActivityMetadata';
import { IActivityExecutor, ActivityExecutorToken } from './IActivityExecutor';



/**
 * activity base.
 *
 * @export
 * @abstract
 * @class ActivityBase
 * @implements {IActivity}
 * @implements {OnActivityInit}
 */
@Abstract()
export abstract class Activity<T = any, TCtx extends ActivityContext = ActivityContext> implements IActivity<T, TCtx> {
    /**
     * is scope or not.
     *
     * @type {boolean}
     * @memberof Activity
     */
    readonly runScope: boolean

    protected _enableSetResult?: boolean;


    /**
     * activity display name.
     *
     * @type {string}
     * @memberof Activity
     */
    @Input() name: string;

    @Input() pipe: string;
    /**
     * conatiner.
     *
     * @type {IContainer}
     * @memberof Activity
     */
    @Inject(InjectorProxyToken)
    private injProxy: InjectorProxy<ICoreInjector>;

    constructor() {

    }

    getInjector(): ICoreInjector {
        return this.injProxy();
    }

    getContainer(): IContainer {
        return this.getInjector().getContainer();
    }

    /**
     * run activity.
     *
     * @abstract
     * @param {TCtx} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof Activity
     */
    async run(ctx: TCtx, next?: () => Promise<void>): Promise<void> {
        ctx.status.current = this;
        await this.initResult(ctx);
        await this.execute(ctx);
        await this.setResult(ctx);
        if (next) {
            await next();
        }
    }

    protected abstract execute(ctx: TCtx): Promise<void>;

    protected async initResult(ctx: TCtx): Promise<any> {
        let runspc = ctx.status.scopes.find(s => isDefined(s.has(ActivityResult)));
        let ret = runspc ? runspc.get(ActivityResult) : ctx.data;
        if (this._enableSetResult !== false && !isNullOrUndefined(ret)) {
            if (this.pipe) {
                this.result = ctx.injector.get(ComponentBuilderToken)
                    .getPipe(this.pipe, this.getInjector())
                    ?.transform(ret);
            } else {
                this.result = ret;
            }
        }
        if (this.runScope) {
            ctx.status.currentScope.set(ActivityResult, this.result);
        }
    }

    protected async setResult(ctx: TCtx) {
        if (this.runScope) {
            ctx.status.scopeEnd();
        }
        if (this._enableSetResult !== false && !isNullOrUndefined(this.result)) {
            ctx.status.currentScope.set(ActivityResult, this.result);
            if (this.pipe) {
                ctx.injector.get(ComponentBuilderToken)
                    .getPipe(this.pipe, this.getInjector())
                    ?.reverse(ctx, this.result);
            }
        }
    }

    private _executor: IActivityExecutor;
    getExector(): IActivityExecutor {
        if (!this._executor) {
            this._executor = this.getContainer().resolve(ActivityExecutorToken);
        }
        return this._executor;
    }


    protected async runActivity(ctx: TCtx, activities: ActivityType | ActivityType[], next?: () => Promise<void>, refresh?: boolean): Promise<void> {
        await this.getExector().runActivity(ctx, activities, next);
        if (refresh !== false) {
            await this.initResult(ctx);
        }
    }

    protected runWorkflow(ctx: TCtx, activity: ActivityType, body?: any): Promise<TCtx> {
        return this.getExector().runWorkflow(ctx, activity, body);
    }

    private _actionFunc: PromiseUtil.ActionHandle;
    toAction(): PromiseUtil.ActionHandle<T> {
        if (!this._actionFunc) {
            this._actionFunc = (ctx: TCtx, next?: () => Promise<void>) => this.run(ctx, next);
        }
        return this._actionFunc;
    }

    /**
     * resolve expression.
     *
     * @protected
     * @template TVal
     * @param {ExpressionType<T>} express
     * @param {T} ctx
     * @returns {Promise<TVal>}
     * @memberof Activity
     */
    protected async resolveExpression<TVal>(express: Expression<TVal>, ctx: TCtx): Promise<TVal> {
        if (isNullOrUndefined(express)) {
            return null;
        }
        return await this.getExector().resolveExpression(ctx, express, this.getContainer());
    }

    protected promiseLikeToAction<T extends ActivityContext = ActivityContext>(action: (ctx?: T) => Promise<any>): PromiseUtil.ActionHandle<T> {
        return async (ctx: T, next?: () => Promise<void>) => {
            await action(ctx);
            if (next) {
                await next();
            }
        }
    }

}


/**
 * target is activity class.
 *
 * @export
 * @param {*} target
 * @returns {target is Type<IActivity>}
 */
export function isAcitvityClass(target: any, ext?: (meta: ActivityMetadata) => boolean): target is Type<IActivity> {
    if (!isClass(target)) {
        return false;
    }
    let key = Task.toString();
    if (Reflect.hasOwnMetadata(key, target)) {
        if (ext) {
            return Reflect.getOwnMetadata(key, target).some(meta => meta && ext(meta));
        }
        return true;
    }
    return false;
}
