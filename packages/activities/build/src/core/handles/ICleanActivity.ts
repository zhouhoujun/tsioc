import { InjectAcitityToken, ExpressionType, Src, Expression } from '@taskfr/core';
import { BuildHandleConfigure, IBuildHandleActivity } from '../BuildHandle';


/**
 * clean activity.
 *
 * @export
 * @interface ICleanActivity
 * @extends {IBuildHandleActivity}
 */
export interface ICleanActivity  extends IBuildHandleActivity {
    /**
     * clean source.
     *
     * @type {Expression<Src>}
     * @memberof ICleanActivity
     */
    clean: Expression<Src>;
}

/**
 * clean task token.
 */
export const CleanToken = new InjectAcitityToken<ICleanActivity>('clean');

/**
 * clean configure
 *
 * @export
 * @interface ICleanConfigure
 * @extends {ActivityConfigure}
 */
export interface CleanConfigure extends BuildHandleConfigure {
    /**
     * clean match.
     *
     * @type {ExpressionType<Src>}
     * @memberof ICleanConfigure
     */
    clean: ExpressionType<Src>;
}
