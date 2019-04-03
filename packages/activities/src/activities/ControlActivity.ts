import { ActivityContext, Activity } from '../core';
import { lang } from '@tsdi/ioc';

/**
 * control activity.
 *
 * @export
 * @abstract
 * @class ControlActivity
 * @extends {Activity}
 */
export abstract class ControlActivity<T extends ActivityContext> extends Activity<T> {
    /**
     * to string.
     *
     * @returns {string}
     * @memberof ControlActivity
     */
    toString(): string {
        return `[${ lang.getClassName(this)}]`;
    }
}
