import { ActivityConfigure } from '@taskfr/core';
import { TransformExpress } from './transformTypes';

/**
 * pipe configure.
 *
 * @export
 * @interface ITransformConfigure
 * @extends {ActivityConfigure}
 */
export interface ITransformConfigure extends ActivityConfigure {
    /**
     * transform pipes
     *
     * @type {TransformExpress}
     * @memberof ITransformConfigure
     */
    pipes?: TransformExpress;
}
