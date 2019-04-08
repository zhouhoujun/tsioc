import { ActivityContext, ActivityOption, Expression, ActivityType, TemplateActivity } from '../core';
import { lang } from '@tsdi/ioc';


/**
 * condition option.
 *
 * @export
 * @interface ConditionOption
 * @extends {ActivityOption}
 */
export interface ConditionOption<T extends ActivityContext> extends ActivityOption {
    /**
     * condition
     *
     * @type {Expression<boolean>}
     * @memberof ConditionOption
     */
    condition: Expression<boolean>;
    /**
     * body.
     *
     * @type {(ActivityType<T> | ActivityType<T>[])}
     * @memberof ConditionOption
     */
    body: ActivityType<T> | ActivityType<T>[];
}

/**
 * control activity.
 *
 * @export
 * @abstract
 * @class ControlActivity
 * @extends {Activity}
 */
export abstract class ControlActivity<T extends ActivityContext> extends TemplateActivity<T> {

    /**
     * to string.
     *
     * @returns {string}
     * @memberof ControlActivity
     */
    toString(): string {
        return `[${lang.getClassName(this)}]`;
    }
}
