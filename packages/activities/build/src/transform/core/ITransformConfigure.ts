import { TransformExpress } from './transformTypes';
import { CompilerConfigure } from '../../core';

/**
 * pipe configure.
 *
 * @export
 * @interface ITransformConfigure
 * @extends {ActivityConfigure}
 */
export interface ITransformConfigure extends CompilerConfigure {
    /**
     * transform pipes
     *
     * @type {TransformExpress}
     * @memberof ITransformConfigure
     */
    pipes?: TransformExpress;
}
