import {
    IHandleActivity, Expression, HandleConfigure, ExpressionType,
    Active, CtxType, InjectAcitityToken
} from '@taskfr/core';
import { Express } from '@ts-ioc/core';
import { ICompiler } from './ICompiler';


/**
 * build handle activity.
 *
 * @export
 * @interface IBuildHandleActivity
 * @extends {IHandleActivity}
 */
export interface IBuildHandleActivity extends IHandleActivity {
    /**
     * compiler
     *
     * @type {ICompiler}
     * @memberof IBuildHandleActivity
     */
    compiler: ICompiler;

    /**
     * test files macth or not to deal with.
     *
     * @type {(Expression<string | RegExp | Express<string, boolean>>)}
     * @memberof IBuildHandleActivity
     */
    test: Expression<string | RegExp | Express<string, boolean>>;
}



/**
 * handle config
 *
 * @export
 * @interface BuildHandleConfigure
 * @extends {ActivityConfigure}
 */
export interface BuildHandleConfigure extends HandleConfigure {
    /**
     * file filter
     *
     * @type {ExpressionType<string | RegExp| Express<string, boolean>>}
     * @memberof BuildHandleConfigure
     */
    test?: ExpressionType<string | RegExp | Express<string, boolean>>;

    /**
     * compiler
     *
     * @type {Active}
     * @memberof BuildHandleConfigure
     */
    compiler?: Active;

    /**
     * sub dist
     *
     * @type {CtxType<string>}
     * @memberof BuildHandleConfigure
     */
    subDist?: CtxType<string>;
}

/**
 * build handle token.
 */
export const BuildHandleToken = new InjectAcitityToken<IBuildHandleActivity>('build-handle');
