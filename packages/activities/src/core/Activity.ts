import { Task } from '../decorators/Task';
import { IContainer, ContainerToken } from '@tsdi/core';
import { RunnerService, BuilderService } from '@tsdi/boot';
import { ActivityContext } from './ActivityContext';
import { ActivityMetadata } from '../metadatas';
import {
    isClass, Type, hasClassMetadata, getOwnTypeMetadata, isFunction,
    isPromise, Abstract, PromiseUtil, Inject, isMetadataObject, isArray
} from '@tsdi/ioc';
import { ActivityType, Expression, ControlTemplate } from './ActivityConfigure';
import { SelectorManager } from './SelectorManager';
import { ActivityOption } from './ActivityOption';


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
export abstract class Activity<T extends ActivityContext> {

    /**
     * activity display name.
     *
     * @type {string}
     * @memberof Activity
     */
    name: string;

    /**
     * conatiner.
     *
     * @type {IContainer}
     * @memberof Activity
     */
    @Inject(ContainerToken)
    container: IContainer;


    constructor() {
    }

    /**
     * init activity.
     *
     * @param {ControlTemplate<T>} option
     * @memberof Activity
     */
    async init(option: ControlTemplate<T>) {

    }

    /**
     * execute activity.
     *
     * @abstract
     * @param {T} ctx
     * @param {() => Promise<void>} next
     * @returns {Promise<void>}
     * @memberof Activity
     */
    abstract execute(ctx: T, next: () => Promise<void>): Promise<void>;

    protected execActivity(ctx: T, activities: ActivityType<T> | ActivityType<T>[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain((isArray(activities) ? activities : [activities]).map(ac => this.toAction(ac)), ctx, next);
    }

    protected execActions(ctx: T, actions: PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain(actions, ctx, next);
    }

    protected toAction(activity: ActivityType<T>): PromiseUtil.ActionHandle<T> {
        if (activity instanceof Activity) {
            return (ctx: T, next?: () => Promise<void>) => activity.execute(ctx, next);
        } else if (isClass(activity) || isMetadataObject(activity)) {
            return async (ctx: T, next?: () => Promise<void>) => {
                let act = await this.buildActivity(activity as Type<any> | ActivityOption<T>);
                if (act) {
                    await act.execute(ctx, next);
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

    protected async buildActivity(activity: Type<any> | ActivityOption<T>): Promise<Activity<T>> {
        if (!isClass(activity)) {
            if (!activity.module) {
                let mgr = this.container.get(SelectorManager);
                Object.keys(activity).some(key => {
                    if (mgr.has(key)) {
                        activity.module = mgr.get(key);
                    }
                    return isClass(activity.module);
                });
            }
        }
        let ctx = await this.container.get(BuilderService).build(activity) as ActivityContext;
        if (ctx.target instanceof Activity) {
            return ctx.target;
        } else {
            ctx.autorun = false;
            await this.container.get(RunnerService).run(ctx);
            return ctx.runnable.getActivity();
        }
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
    protected async resolveExpression<TVal>(express: Expression<TVal>, ctx: T): Promise<TVal> {
        if (isClass(express)) {
            let bctx = await this.container.get(RunnerService).run(express);
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
