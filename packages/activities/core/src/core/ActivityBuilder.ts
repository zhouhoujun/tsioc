import { ActivityBuilderToken, IActivityBuilder } from './IActivityBuilder';
import { isFunction, isString, Token, Express, isToken, Injectable } from '@ts-ioc/core';
import { AnnotationBuilder } from '@ts-ioc/bootstrap';
import { Task } from '../decorators';
import { IActivity, ActivityInstance, InjectAcitityToken } from './IActivity';
import { ActivityConfigure, ActivityType, ExpressionType, isActivityType, Expression } from './ActivityConfigure';


/**
 * activity builder.
 *
 * @export
 * @class ActivityBuilder
 * @extends {AnnotationBuilder<IActivity>}
 * @implements {IActivityBuilder}
 */
@Injectable(ActivityBuilderToken)
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
     * @param {string} uuid
     * @returns {Promise<IActivity>}
     * @memberof ActivityBuilder
     */
    async createInstance(token: Token<IActivity>, config: ActivityConfigure, uuid: string): Promise<IActivity> {
        if (isString(token)) {
            token = this.traslateStrToken(token);
        }

        let instance = await super.createInstance(token, config, uuid) as ActivityInstance;
        if (!instance) {
            return null;
        }

        if (isString(uuid)) {
            instance.id = uuid;
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

    getType(config: ActivityConfigure): Token<IActivity> {
        let token = config.activity || config.task || config.token || config.type;
        if (isString(token)) {
            token = this.traslateStrToken(token);
        }
        return token;
    }

    getDecorator() {
        return Task.toString();
    }

    protected resolveToken(token: Token<IActivity>, uuid?: string): IActivity {
        let activity = this.container.resolve(token);
        activity.id = uuid;
        return activity;
    }

    protected traslateStrToken(token: string): Token<IActivity> {
        let taskToken = new InjectAcitityToken(token);
        if (this.container.has(taskToken)) {
            return taskToken;
        }
        return token;
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
            rt = await target.getContext().exec(target, result);
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
