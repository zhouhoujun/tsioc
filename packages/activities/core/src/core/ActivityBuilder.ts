import { ActivityBuilderToken, IActivityBuilder } from './IActivityBuilder';
import { isFunction, isString, Token, Express, isToken, Injectable, Providers, ModuleValidateToken } from '@ts-ioc/core';
import { AnnotationBuilder } from '@ts-ioc/bootstrap';
import { IActivity, ActivityInstance } from './IActivity';
import { ActivityConfigure, ActivityType, ExpressionType, isActivityType, Expression } from './ActivityConfigure';
import { ActivityVaildateToken } from './ActivityVaildate';


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
    { provide: ModuleValidateToken, useExisting: ActivityVaildateToken }
])
export class ActivityBuilder extends AnnotationBuilder<IActivity> implements IActivityBuilder {

    /**
     * build activity.
     *
     * @param {Token<IActivity>} token
     * @param {ActivityConfigure} config
     * @param {*} [data]
     * @returns {Promise<IActivity>}
     * @memberof ActivityBuilder
     */
    build(token: Token<IActivity>, config: ActivityConfigure, data?: any): Promise<IActivity> {
        return super.build(token, config, data);
    }

    /**
     * build by config activity.
     *
     * @param {ActivityType<any>} activity
     * @param {*} data
     * @returns
     * @memberof ActivityBuilder
     */
    buildByConfig(activity: ActivityType<any>, data: any) {
        return super.buildByConfig(activity, data);
    }

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

    protected getDefaultValidateToken() {
        return ActivityVaildateToken;
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
            return await this.buildByConfig(exptype, target.id) as Expression<T>;
        } else {
            return exptype as Expression<T>;
        }
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
        if (isActivityType(exptype, !valify)) {
            if (valify) {
                result = await this.buildByConfig(isToken(exptype) ? exptype : valify(exptype as TCfg), target.id);
            } else {
                result = await this.buildByConfig(exptype, target.id);
            }
        } else {
            result = exptype;
        }

        if (isRightActivity(result)) {
            return result;
        }

        let rt;
        if (isString(result)) {
            rt = result;
        } else {
            rt = await target.context.exec(target, result);
        }
        let config = toConfig(rt);
        if (valify) {
            config = valify(config);
        }
        if (config) {
            result = await this.buildByConfig(config, target.id);
        } else {
            result = null;
        }
        return result;
    }

}
