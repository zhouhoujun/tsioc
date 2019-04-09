import { ActivityContext, CompoiseActivity } from '../core';
import { lang } from '@tsdi/ioc';


/**
 * control activity.
 *
 * @export
 * @abstract
 * @class ControlActivity
 * @extends {Activity}
 */
export abstract class ControlActivity<T extends ActivityContext> extends CompoiseActivity<T> {

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
