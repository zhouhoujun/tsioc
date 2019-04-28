import { Task } from '../decorators/Task';
import { IContainer, ContainerToken } from '@tsdi/core';
import { RunnerService, BuilderService } from '@tsdi/boot';
import { ActivityContext } from './ActivityContext';
import { ActivityMetadata } from '../metadatas';
import {
    isClass, Type, hasClassMetadata, getOwnTypeMetadata, isFunction,
    isPromise, Abstract, PromiseUtil, Inject, isMetadataObject, isArray,
    ProviderTypes, lang, isNullOrUndefined
} from '@tsdi/ioc';
import { ActivityType, Expression, ControlTemplate } from './ActivityConfigure';
import { SelectorManager } from './SelectorManager';
import { ActivityResult, NextToken } from './ActivityResult';
import { Input } from '../decorators';


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
     * activity display name.
     *
     * @type {string}
     * @memberof Activity
     */
    @Input()
    name: string;

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
    private containerGetter: () => IContainer;


    constructor(@Inject(ContainerToken) container: IContainer) {
        this.containerGetter = () => container;
    }

    getContainer(): IContainer {
        return this.containerGetter();
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
        this._result = this.createResult(next);
        await this.execute(ctx);
        if (this.isScope) {
            ctx.runnable.status.scopes.shift();
        }

        this.bindingResult(ctx);
        await this.result.next(ctx);
    }

    protected bindingResult(ctx: ActivityContext) {
        if (!isNullOrUndefined(this.result.value)) {
            ctx.data = this.result.value;
        }
    }

    protected abstract execute(ctx: ActivityContext): Promise<void>;

    protected createResult(next?: () => Promise<void>, ...providers: ProviderTypes[]): ActivityResult<any> {
        providers.unshift({ provide: NextToken, useValue: next });
        return this.getContainer().getService(ActivityResult, lang.getClass(this), ...providers);
    }

    protected execActivity(ctx: ActivityContext, activities: ActivityType | ActivityType[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain((isArray(activities) ? activities : [activities]).map(ac => this.toAction(ac)), ctx, next);
    }

    protected execActions<T extends ActivityContext>(ctx: ActivityContext, actions: PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain(actions, ctx, next);
    }

    protected toAction<T extends ActivityContext>(activity: ActivityType): PromiseUtil.ActionHandle<T> {
        if (activity instanceof Activity) {
            return (ctx: T, next?: () => Promise<void>) => activity.run(ctx, next);
        } else if (isClass(activity) || isMetadataObject(activity)) {
            return async (ctx: T, next?: () => Promise<void>) => {
                let act = await this.buildActivity(activity as Type<any> | ControlTemplate);
                if (act) {
                    await act.run(ctx, next);
                } else {
                    await next();
                }
            };

        } else if (isFunction(activity)) {
            return activity;
        } else {
            return (ctx: T, next?: () => Promise<void>) => next && next();
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
        return ctx.getActivity();
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
        if (isClass(express)) {
            let bctx = await this.getContainer().get(RunnerService).run(express);
            return bctx.data;
        } else if (isFunction(express)) {
            return await express(ctx);
        } else if (isPromise(express)) {
            return await express;
        }
        return express;
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
