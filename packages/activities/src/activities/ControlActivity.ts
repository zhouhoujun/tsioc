import { ActivityContext, CompoiseActivity, ActivityType } from '../core';
import { lang, isArray } from '@tsdi/ioc';


/**
 * control activity.
 *
 * @export
 * @abstract
 * @class ControlActivity
 * @extends {Activity}
 */
export abstract class ControlActivity<T extends ActivityContext> extends CompoiseActivity<T> {

    protected initBody(option: ActivityType<T> | ActivityType<T>[]) {
        option && this.add(...isArray(option) ? option : [option]);
    }
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
