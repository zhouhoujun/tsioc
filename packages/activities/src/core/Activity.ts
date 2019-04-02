import {
    Express, Token, ProviderType, lang, isFunction, isToken, isBaseObject, isClass,
    Type, hasClassMetadata, getOwnTypeMetadata, isBoolean, isNullOrUndefined, isString
} from '@tsdi/ioc';
import { Task } from '../decorators/Task';
import { OnActivityInit } from './OnActivityInit';
import {
    ActivityConfigure, ExpressionType, Expression, ActivityType,
    Active, ExpressionToken, isActivityType
} from './ActivityConfigure';
import { IActivityMetadata } from '../metadatas';
import { ResolveServiceContext } from '@tsdi/core';
import { RunnerService, Handle } from '@tsdi/boot';
import { ActivityContext } from './ActivityContext';
import { IActivity } from './IActivity';
import { IActivityContext } from './IActivityContext';


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
export abstract class Activity<T extends IActivityContext> extends Handle<T> implements IActivity, OnActivityInit {

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

    async onActivityInit(config: ActivityConfigure) {
        this._config = config;
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
    protected async toExpression<T>(exptype: ExpressionType<T>, target?: IActivity, ctx?: ActivityContext<T>): Promise<Expression<T>> {
        if (isActivityType(exptype)) {
            return await this.buildActivity(exptype, target) as Expression<T>;
        } else {
            return exptype as Expression<T>;
        }
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
    protected async resolveExpression<T>(express: ExpressionType<T>, ctx?: ActivityContext<T>): Promise<T> {
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
    * @param {Activity} activity
    * @param {ActivityContext<any>} ctx
    * @param {any} [data]
    * @returns
    * @memberof Activity
    */
    protected async execActivity(activity: Activity | Active | ExpressionToken<any>, ctx: ActivityContext<any> | (() => ActivityContext<any>), data?: any): Promise<ActivityContext<any>> {
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

    protected runActivity(activity: Activity, ctx: ActivityContext<any>, data?: any) {
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
    protected async toActivity<Tr, Ta extends IActivity, TCfg extends ActivityConfigure>(
        exptype: ExpressionType<Tr> | ActivityType<Ta>,
        isRightActivity: Express<any, boolean>,
        toConfig: Express<Tr, TCfg>,
        valify?: Express<TCfg, TCfg>,
        target?: IActivity): Promise<Ta> {

        let result;
        let config;
        if (isActivityType(exptype, !valify)) {
            if (valify) {
                config = isToken(exptype) ? exptype : valify(exptype as TCfg);
                result = await this.buildActivity(config, target);
            } else {
                result = await this.buildActivity(exptype, target);
            }
        } else {
            result = exptype;
        }

        if (!isRightActivity(result)) {
            let rt;
            if (isString(result)) {
                rt = result;
            } else {
                rt = await this.execActivity(target, result);
            }
            config = toConfig(rt);
            if (valify) {
                config = valify(config);
            }
            if (config) {
                result = await this.buildActivity(config, target);
            }
        }
        return result;
    }

    protected buildActivity<T extends IActivity>(config: ActivityType<T>, target?: IActivity): Promise<T> {
        return this.container.get(RunnerService).run(isToken(config) ? { type: config, target: target } : Object.assign(config, { targe: target }));
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
