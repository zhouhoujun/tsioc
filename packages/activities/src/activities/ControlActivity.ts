import { Activity, ActivityContext } from '../core';

/**
 * control
 *
 * @export
 * @abstract
 * @class ControlActivity
 * @extends {Activity<T>}
 * @template T
 */
export abstract class ControlActivity<T = any> extends Activity<T> {

    protected setActivityResult(ctx: ActivityContext) {

    }

    protected setContextResult(ctx: ActivityContext) {

    }
}
