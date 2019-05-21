import { Task } from '../decorators/Task';
import { IContainer } from '@tsdi/core';
import { BuilderService, Input, SelectorManager, ComponentManager } from '@tsdi/boot';
import { ActivityContext } from './ActivityContext';
import { ActivityMetadata } from '../metadatas';
import {
    isClass, Type, hasClassMetadata, getOwnTypeMetadata, isFunction,
    Abstract, PromiseUtil, Inject, isMetadataObject, isArray,
    ProviderTypes, lang, isNullOrUndefined, ContainerFactoryToken, ContainerFactory
} from '@tsdi/ioc';
import { ActivityType, Expression, ControlTemplate } from './ActivityConfigure';
import { ActivityResult, NextToken } from './ActivityResult';
import { ValuePipe } from './ValuePipe';



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
        let result = this.getContainer().getService(ActivityResult, lang.getClass(this), ...providers);
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


    protected async runActivity(ctx: ActivityContext, activities: ActivityType | ActivityType[], next?: () => Promise<void>, refresh?: boolean): Promise<void> {
        if (!activities || (isArray(activities) && activities.length < 1)) {
            return;
        }
        await this.execActions(ctx, (isArray(activities) ? activities : [activities]).map(ac => this.parseAction(ac)), next);
        if (refresh !== false) {
            await this.refreshResult(ctx);
        }
    }

    protected execActions<T extends ActivityContext>(ctx: ActivityContext, actions: PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain(actions.filter(f => f), ctx, next);
    }

    private _actionFunc: PromiseUtil.ActionHandle<any>;
    toAction<T extends ActivityContext>(): PromiseUtil.ActionHandle<T> {
        if (!this._actionFunc) {
            this._actionFunc = (ctx: T, next?: () => Promise<void>) => this.run(ctx, next);
        }
        return this._actionFunc;
    }

    protected parseAction<T extends ActivityContext>(activity: ActivityType): PromiseUtil.ActionHandle<T> {
        if (activity instanceof Activity) {
            return activity.toAction();
        } else if (isClass(activity) || isMetadataObject(activity)) {
            return async (ctx: T, next?: () => Promise<void>) => {
                let act = await this.buildActivity(activity as Type<any> | ControlTemplate);
                if (act instanceof Activity) {
                    await act.run(ctx, next);
                } else if (act) {
                    let component = this.getContainer().get(ComponentManager).getLeaf(act);
                    if (component instanceof Activity) {
                        await component.run(ctx, next);
                    } else {
                        console.log(act);
                        throw new Error(lang.getClassName(act) + ' is not activity');
                    }
                } else {
                    await next();
                }
            };

        }
        if (isFunction(activity)) {
            return activity;
        }
        if (activity) {
            let component = this.getContainer().get(ComponentManager).getLeaf(activity);
            if (component instanceof Activity) {
                return component.toAction();
            }
        }
        return null;

    }

    protected promiseLikeToAction<T extends ActivityContext>(action: (ctx?: T) => Promise<any>): PromiseUtil.ActionHandle<T> {
        return async (ctx: T, next?: () => Promise<void>) => {
            await action(ctx);
            if (next) {
                await next();
            }
        }
    }

    protected async buildActivity(activity: Type<any> | ControlTemplate): Promise<Activity<any>> {
        let ctx: ActivityContext;
        let container = this.getContainer();
        if (isClass(activity)) {
            ctx = await container.get(BuilderService).build<ActivityContext>(activity);
        } else {
            let md: Type<any>;
            let mgr = container.get(SelectorManager);
            if (isClass(activity.activity)) {
                md = activity.activity;
            } else {
                md = mgr.get(activity.activity)
            }

            let option = {
                module: md,
                template: activity
            };
            ctx = await container.get(BuilderService).build<ActivityContext>(option);
        }
        return ctx.getBootTarget();
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
        return await ctx.resolveExpression(express, this.getContainer());
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
export function isAcitvityClass(target: any, ext?: (meta: ActivityMetadata) => boolean): target is Type<Activity<any>> {
    if (!isClass(target)) {
        return false;
    }
    if (hasClassMetadata(Task, target)) {
        if (ext) {
            return getOwnTypeMetadata<ActivityMetadata>(Task, target).some(meta => meta && ext(meta));
        }
        return true;
    }
    return false;
}
