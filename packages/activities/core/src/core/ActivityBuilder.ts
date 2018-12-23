import { ActivityBuilderToken, IActivityBuilder } from './IActivityBuilder';
import { isString, Token, Express, isToken, Injectable, Providers, MetaAccessorToken, Singleton } from '@ts-ioc/core';
import { AnnotationBuilder, BuildOptions, IAnnoBuildStrategy, InjectAnnoBuildStrategyToken } from '@ts-ioc/bootstrap';
import { IActivity, ActivityInstance } from './IActivity';
import { ActivityConfigure, ActivityType, ExpressionType, isActivityType, Expression } from './ActivityConfigure';
import { ActivityMetaAccessorToken } from '../injectors';
import { IWorkflowInstance } from './IWorkflowInstance';
import { Activity } from './Activity';


/**
 * activity builder.
 *
 * @export
 * @class ActivityBuilder
 * @extends {AnnotationBuilder<IActivity>}
 * @implements {IActivityBuilder}
 */
@Singleton(ActivityBuilderToken)
@Providers([
    { provide: MetaAccessorToken, useExisting: ActivityMetaAccessorToken }
])
export class ActivityBuilder extends AnnotationBuilder<IActivity> implements IActivityBuilder {

    /**
     * create instance.
     *
     * @param {Token<IActivity>} token
     * @param {ActivityConfigure} config
     * @param {BuildOptions<IActivity>} [options]
     * @returns {Promise<IActivity>}
     * @memberof ActivityBuilder
     */
    async createInstance(token: Token<IActivity>, config: ActivityConfigure, options?: BuildOptions<IActivity>): Promise<IActivity> {
        let instance = await super.createInstance(token, config, options) as ActivityInstance;
        if (!instance || !(instance instanceof Activity)) {
            let boot = this.getMetaAccessor(token, config).getBootToken(config, this.container);
            if (isToken(boot)) {
                instance = await super.createInstance(boot, config, options) as ActivityInstance;
            }
        }
        if (!instance || !(instance instanceof Activity)) {
            return null;
        }
        return instance;
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
            return await this.buildActivity(exptype, target) as any;
        } else {
            return exptype as Expression<T>;
        }
    }

    async buildActivity<T extends IActivity>(config: ActivityType<T>, target: IActivity): Promise<T> {
        return await this.build(config, { target: target }) as T;
    }

    /**
     * run annotation instance.
     *
     * @param {IActivity} instance
     * @param {AnnotationConfigure<T>} [config]
     * @param {Token<T>} [token]
     * @returns {Promise<Runnable<T>>}
     * @memberof AnnotationBuilder
     */
    resolveRunable(instance: IActivity, config?: ActivityConfigure, token?: Token<any> | BuildOptions<IActivity>, options?: BuildOptions<IActivity>): IWorkflowInstance<any> {
        return super.resolveRunable(instance, config, token, options) as IWorkflowInstance<any>;
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
    async toActivity<Tr, Ta extends IActivity, TCfg extends ActivityConfigure>(
        exptype: ExpressionType<Tr> | ActivityType<Ta>,
        target: IActivity,
        isRightActivity: Express<Ta, boolean>,
        toConfig: Express<Tr, TCfg>,
        valify?: Express<TCfg, TCfg>): Promise<Ta> {

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
                rt = await target.context.exec(target, result);
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
}


export const ActivityBuildStrategyToken = new InjectAnnoBuildStrategyToken(Activity);

/**
 * activity build strategy.
 *
 * @export
 * @class ActivityBuildStrategy
 * @implements {IAnnoBuildStrategy<IActivity>}
 */
@Singleton(ActivityBuildStrategyToken)
export class ActivityBuildStrategy implements IAnnoBuildStrategy<IActivity> {
    async build(instance: Activity, config: ActivityConfigure, options: BuildOptions<IActivity>): Promise<void> {
        if (!instance) {
            return;
        }
        if (config.name) {
            instance.name = config.name;
        }
        instance.config = config;
        await instance.onActivityInit(config);
    }
}

