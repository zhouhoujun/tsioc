import { ActivityBuilderToken, IActivityBuilder } from './IActivityBuilder';
import { isFunction, isString, Token, Express, isToken, Injectable, Providers, MetaAccessorToken } from '@ts-ioc/core';
import { AnnotationBuilder } from '@ts-ioc/bootstrap';
import { IActivity, ActivityInstance } from './IActivity';
import { ActivityConfigure, ActivityType, ExpressionType, isActivityType, Expression } from './ActivityConfigure';
import { ActivityMetaAccessorToken } from '../injectors';
import { IWorkflowInstance } from './IWorkflowInstance';


/**
 * activity builder.
 *
 * @export
 * @class ActivityBuilder
 * @extends {AnnotationBuilder<IActivity>}
 * @implements {IActivityBuilder}
 */
@Injectable(ActivityBuilderToken)
@Providers([
    { provide: MetaAccessorToken, useExisting: ActivityMetaAccessorToken }
])
export class ActivityBuilder extends AnnotationBuilder<IActivity> implements IActivityBuilder {

    /**
     * create instance.
     *
     * @param {Token<IActivity>} token
     * @param {ActivityConfigure} config
     * @param {any} data
     * @returns {Promise<IActivity>}
     * @memberof ActivityBuilder
     */
    async createInstance(token: Token<IActivity>, config: ActivityConfigure, data: any): Promise<IActivity> {
        let instance = await super.createInstance(token, config, data) as ActivityInstance;
        if (!instance) {
            return null;
        }

        if (isFunction(instance.onActivityInit)) {
            await Promise.resolve(instance.onActivityInit(config));
        }
        return instance;
    }

    async buildStrategy(activity: IActivity, config: ActivityConfigure, data?: any): Promise<IActivity> {
        if (config.name) {
            activity.name = config.name;
        }
        activity.config = config;
        return activity;
    }

    protected resolveToken(token: Token<IActivity>): IActivity {
        let activity = this.container.resolve(token);
        return activity;
    }

    /**
     * to expression
     *
     * @template T
     * @param {ExpressionType<T>} exptype
     * @param {IActivity} target
     * @returns {Promise<Expression<T>>}
     * @memberof ActivityTypeBuilder
     */
    async toExpression<T>(exptype: ExpressionType<T>, target: IActivity): Promise<Expression<T>> {
        if (isActivityType(exptype)) {
            return await this.buildByConfig(exptype, target.id) as any;
        } else {
            return exptype as Expression<T>;
        }
    }

    async buildActivity<T extends IActivity>(config: ActivityType<T>, id: string): Promise<T> {
        return await this.buildByConfig(config, id) as T;
    }

    /**
     * run annotation instance.
     *
     * @param {T} instance
     * @param {AnnotationConfigure<T>} [config]
     * @param {Token<T>} [token]
     * @returns {Promise<Runnable<T>>}
     * @memberof AnnotationBuilder
     */
    resolveRunable(instance: IActivity, config?: ActivityConfigure, token?: Token<any>): IWorkflowInstance<any> {
        return super.resolveRunable(instance, config, token) as IWorkflowInstance<any>;
    }

    /**
    * to activity.
    *
    * @template Tr
    * @template Ta
    * @template TCfg
    * @param {(ExpressionType<Tr> | ActivityType<Ta>)} exptype
    * @param {IActivity} target
    * @param {Express<any, boolean>} isRightActivity
    * @param {Express<Tr, TCfg>} toConfig
    * @param {Express<TCfg, TCfg>} [valify]
    * @returns {Promise<Ta>}
    * @memberof ActivityTypeBuilder
    */
    async toActivity<Tr, Ta extends IActivity, TCfg extends ActivityConfigure>(exptype: ExpressionType<Tr> | ActivityType<Ta>, target: IActivity, isRightActivity: Express<Ta, boolean>, toConfig: Express<Tr, TCfg>, valify?: Express<TCfg, TCfg>): Promise<Ta> {
        let result;
        let config;
        if (isActivityType(exptype, !valify)) {
            if (valify) {
                result = await this.buildByConfig(isToken(exptype) ? exptype : valify(exptype as TCfg), target.id);
            } else {
                result = await this.buildByConfig(exptype, target.id);
            }
        } else {
            result = exptype;
        }

        if (!isRightActivity(result)) {
            let rt;
            if (isString(result)) {
                rt = result;
            } else {
                rt = await target.context.exec(target, result);
            }
            config = toConfig(rt);
            if (valify) {
                config = valify(config);
            }
            if (config) {
                result = await this.buildByConfig(config, target.id);
            } else {
                result = null;
            }
        }
        return result
    }
}
