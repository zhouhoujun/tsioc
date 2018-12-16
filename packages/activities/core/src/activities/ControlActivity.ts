import { Task } from '../decorators';
import { Activity } from '../core';
import { lang, getClassName } from '@ts-ioc/core';

/**
 * control activity.
 *
 * @export
 * @abstract
 * @class ControlActivity
 * @extends {Activity}
 */
@Task
export abstract class ControlActivity extends Activity {
    /**
     * to string.
     *
     * @returns {string}
     * @memberof ControlActivity
     */
    toString(): string {
        return `[${getClassName(lang.getClass(this))}]`;
    }
}
