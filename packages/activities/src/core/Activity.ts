import { Task } from '../decorators/Task';
import { IContainer } from '@tsdi/core';
import { Input } from '@tsdi/components';
import { ActivityContext } from './ActivityContext';
import {
    isClass, Type, hasClassMetadata, getOwnTypeMetadata, isFunction,
    Abstract, PromiseUtil, Inject, ProviderTypes, lang, isNullOrUndefined,
    ContainerFactoryToken, ContainerFactory
} from '@tsdi/ioc';
import { ActivityConfigure, ActivityType, Expression } from './ActivityConfigure';
import { ActivityResult, NextToken } from './ActivityResult';
import { ValuePipe } from './ValuePipe';
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
export abstract class Activity<T> {

    /**
     * is scope or not.
     *
     * @type {boolean}
     * @memberof Activity
     */
    isScope?: boolean;

    /**
     * component of this activity.
     *
     * @type {*}
     * @memberof Activity
     */
    scope?: any;

    /**
     * components of this activity.
     *
     * @type {any[]}
     * @memberof Activity
     */
    scopes?: any[];

    /**
     * activity display name.
     *
     * @type {string}
     * @memberof Activity
     */
    @Input()
    name: string;

    @Input('pipe')
    pipe: ValuePipe;

    private _result: ActivityResult<T>;
    /**
     * activity result.
     *
     * @type {ActivityResult<T>}
     * @memberof Activity
     */
    get result(): ActivityResult<T> {
        return this._result;
    }

    /**
     * conatiner.
     *
     * @type {IContainer}
     * @memberof Activity
     */
    @Inject(ContainerFactoryToken)
    private containerFac: ContainerFactory;


    constructor() {

    }

    getContainer(): IContainer {
        return this.containerFac() as IContainer;
    }

    /**
     * run activity.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof Activity
     */
    async run(ctx: ActivityContext, next?: () => Promise<void>): Promise<void> {
        ctx.runnable.status.current = this;
        if (this.scope) {
            ctx.scope = this.scope;
        }
        this._result = await this.initResult(ctx, next);
        await this.refreshResult(ctx);
        await this.execute(ctx);
        await this.refreshContext(ctx);
        if (this.isScope) {
            ctx.runnable.status.scopeEnd();
        }
        await this.result.next(ctx);
    }


    protected abstract execute(ctx: ActivityContext): Promise<void>;

    protected async initResult(ctx: ActivityContext, next?: () => Promise<void>, ...providers: ProviderTypes[]): Promise<ActivityResult<any>> {
        providers.unshift({ provide: NextToken, useValue: next });
        let result = this.getContainer().getService({ token: ActivityResult, target: lang.getClass(this) }, ...providers);
        if (!isNullOrUndefined(ctx.result)) {
            if (this.pipe) {
                result.value = this.pipe.transform(ctx.result);
            } else {
                result.value = ctx.result;
            }
        }
        return result;
    }

    protected async refreshResult(ctx: ActivityContext): Promise<any> {
        if (!isNullOrUndefined(ctx.result)) {
            if (this.pipe) {
                this.result.value = await this.pipe.transform(ctx.result);
            } else {
                this.setActivityResult(ctx);
            }
        }
    }

    protected setActivityResult(ctx: ActivityContext) {
        this.result.value = ctx.result;
    }

    protected async refreshContext(ctx: ActivityContext) {
        if (!isNullOrUndefined(this.result.value)) {
            if (this.pipe) {
                if (isFunction(this.pipe.refresh)) {
                    await this.pipe.refresh(ctx, this.result.value);
                }
            } else {
                this.setContextResult(ctx);
            }
        }
    }

    protected setContextResult(ctx: ActivityContext) {
        ctx.result = this.result.value;
    }

    private _executor: IActivityExecutor;
    getExector(): IActivityExecutor {
        if (!this._executor) {
            this._executor = this.getContainer().resolve(ActivityExecutorToken);
        }
        return this._executor;
    }


    protected async runActivity(ctx: ActivityContext, activities: ActivityType | ActivityType[], next?: () => Promise<void>, refresh?: boolean): Promise<void> {
        await this.getExector().runActivity(ctx, activities, next);
        if (refresh !== false) {
            await this.refreshResult(ctx);
        }
    }

    private _actionFunc: PromiseUtil.ActionHandle<any>;
    toAction<T extends ActivityContext>(): PromiseUtil.ActionHandle<T> {
        if (!this._actionFunc) {
            this._actionFunc = (ctx: T, next?: () => Promise<void>) => this.run(ctx, next);
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
    protected async resolveExpression<TVal>(express: Expression<TVal>, ctx: ActivityContext): Promise<TVal> {
        return await this.getExector().resolveExpression(ctx, express, this.getContainer());
    }

    protected promiseLikeToAction<T extends ActivityContext>(action: (ctx?: T) => Promise<any>): PromiseUtil.ActionHandle<T> {
        return async (ctx: T, next?: () => Promise<void>) => {
            await action(ctx);
            if (next) {
                await next();
            }
        }
    }

}

/**
 * is acitivty instance or not.
 *
 * @export
 * @param {*} target
 * @returns {target is Activity}
 */
export function isAcitvity(target: any): target is Activity<any> {
    return target instanceof Activity;
}

/**
 * target is activity class.
 *
 * @export
 * @param {*} target
 * @returns {target is Type<IActivity>}
 */
export function isAcitvityClass(target: any, ext?: (meta: ActivityConfigure) => boolean): target is Type<Activity<any>> {
    if (!isClass(target)) {
        return false;
    }
    if (hasClassMetadata(Task, target)) {
        if (ext) {
            return getOwnTypeMetadata<ActivityConfigure>(Task, target).some(meta => meta && ext(meta));
        }
        return true;
    }
    return false;
}
