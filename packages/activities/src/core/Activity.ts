import { Task } from '../decorators/Task';
import { Handle, RunnerService } from '@tsdi/boot';
import { ActivityContext, Expression, ActivityOption } from './ActivityContext';
import { ActivityMetadata } from '../metadatas';
import { isClass, Type, hasClassMetadata, getOwnTypeMetadata, PromiseUtil, isFunction, isPromise } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';

/**
 *  activity type.
 */
export type ActivityType<T extends ActivityContext> = Type<Activity<T>> | Activity<T> | PromiseUtil.ActionHandle<T>;


/**
 * activity base.
 *
 * @export
 * @abstract
 * @class ActivityBase
 * @implements {IActivity}
 * @implements {OnActivityInit}
 */
export abstract class Activity<T extends ActivityContext> extends Handle<T> {

    /**
     * activity display name.
     *
     * @type {string}
     * @memberof Activity
     */
    name: string;

    protected async execActivity(ctx: T, ...acitivites: ActivityType<T>[]): Promise<void> {
        await this.execActions(ctx, acitivites);
    }


    protected createContext(target: Type<any> | ActivityOption, raiseContainer?: IContainer | (() => IContainer)): ActivityContext {
        return ActivityContext.parse(target, raiseContainer || this.container);
    }

    protected getSelector(ctx: T): Expression<any> {
        let actAnn = ctx.annoation as ActivityOption;
        return ctx.annoation[actAnn.selector];
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
            let bctx = await this.container.get(RunnerService).run(this.createContext(express));
            return bctx.result;
        } else if (isFunction(express)) {
            return await express(ctx);
        } else if (isPromise(express)) {
            return await express;
        }
        return express;
    }

    protected resolveSelector<TVal>(ctx: T): Promise<TVal> {
        return this.resolveExpression(this.getSelector(ctx), ctx);
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
