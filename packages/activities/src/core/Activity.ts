import { Task } from '../decorators/Task';
import { IContainer, ContainerToken } from '@tsdi/core';
import { RunnerService } from '@tsdi/boot';
import { ActivityContext } from './ActivityContext';
import { ActivityMetadata } from '../metadatas';
import {
    isClass, Type, hasClassMetadata, getOwnTypeMetadata, isFunction,
    isPromise, Abstract, PromiseUtil, Inject, isMetadataObject, lang
} from '@tsdi/ioc';
import { ActivityType, ActivityOption, Expression, ControlType } from './ActivityOption';
import { SelectorManager } from './SelectorManager';


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

    @Inject(ContainerToken)
    container: IContainer;


    constructor() {
    }


    abstract execute(ctx: T, next: () => Promise<void>): Promise<void>;


    protected execActivity(ctx: T, handles: ActivityType<T>[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain(handles.map(ac => this.toAction(ac)), ctx, next);
    }

    protected execActions(ctx: T, handles: PromiseUtil.ActionHandle<T>[], next?: () => Promise<void>): Promise<void> {
        return PromiseUtil.runInChain(handles, ctx, next);
    }

    protected toAction(ac: ActivityType<T>): PromiseUtil.ActionHandle<T> {
        if (ac instanceof Activity) {
            return (ctx: T, next?: () => Promise<void>) => ac.execute(ctx, next);
        } else if (isClass(ac) || isMetadataObject(ac)) {
            let action = isClass(ac) ? this.container.get(ac) : this.resolveControl(ac as ControlType<T>);
            return action instanceof Activity ?
                (ctx: T, next?: () => Promise<void>) => action.execute(ctx, next)
                : (ctx: T, next?: () => Promise<void>) => next && next();

        } else if (isFunction(ac)) {
            return ac;
        } else {
            return (ctx: T, next?: () => Promise<void>) => next && next();
        }
    }

    protected resolveControl(option: ControlType<T>): Activity<T> {
        let mgr = this.container.get(SelectorManager);
        let key = Object.keys(option).find(key => mgr.has(key));
        let act = mgr.resolve(key);
        return act;
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

    protected getSelector(ctx: T): Expression<any> {
        let actAnn = ctx.annoation as ActivityOption<T>;
        let mgr = this.container.get(SelectorManager);
        let selector = mgr.getSelector(lang.getClass(this));
        return actAnn[selector];
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
