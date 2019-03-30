import { Task } from '../decorators/Task';
import { Activity } from '../core';
import { lang } from '@tsdi/ioc';

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
        return `[${ lang.getClassName(this)}]`;
    }
}
