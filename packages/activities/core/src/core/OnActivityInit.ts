import { ActivityConfigure } from './ActivityConfigure';

/**
 * on task init.
 *
 * @export
 * @interface OnTaskInit
 */
export interface OnActivityInit {
    /**
     * activity init via config.
     *
     * @param {ActivityConfigure} config
     * @memberof OnTaskInit
     */
    onActivityInit(config: ActivityConfigure): Promise<any>;
}
