import { IActivityContext } from './IActivityContext';
import { IActivity } from './IActivity';

/**
 * handle activity interface.
 *
 * @export
 * @interface IHandleActivity
 * @extends {IActivity}
 */
export interface IHandleActivity extends IActivity {
    /**
     * run task.
     *
     * @param {IActivityContext} [ctx]
     * @param {() => Promise<any>} [next]
     * @returns {Promise<any>}
     * @memberof IHandleActivity
     */
    run(ctx?: IActivityContext, next?: () => Promise<any>): Promise<any>;
}
