import { IHandleActivity, IActivity, Expression, Src } from '@taskfr/core';
import { Express, Registration, Token } from '@ts-ioc/core';
import { BuildHandleContext } from './BuildHandleActivity';

/**
 * compiler activity
 *
 * @export
 * @interface ICompiler
 * @extends {IActivity}
 */
export interface ICompiler extends IActivity {

}

/**
 * source compiler.
 *
 * @export
 * @interface ISourceCompiler
 * @extends {ICompiler}
 */
export interface ISourceCompiler extends ICompiler {
    /**
     * get source.
     *
     * @returns {Src}
     * @memberof ISourceCompiler
     */
    getSource(): Src;
}

/**
 * sourcemaps compiler
 *
 * @export
 * @interface ISourcemapCompiler
 * @extends {ICompiler}
 */
export interface ISourcemapsCompiler extends ICompiler {
    /**
     * init sourcemaps.
     *
     * @param {BuildHandleContext<any>} ctx
     * @memberof ISourcemapsCompiler
     */
    init(ctx: BuildHandleContext<any>);
    /**
     * write sourcemaps.
     *
     * @param {BuildHandleContext<any>} ctx
     * @memberof ISourcemapsCompiler
     */
    write(ctx: BuildHandleContext<any>);
}

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
 * inject compiler token.
 *
 * @export
 * @class InjectCompilerToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectCompilerToken<T extends ICompiler> extends Registration<T> {
    constructor(type: Token<any>) {
        super(type, 'compiler');
    }
}


/**
 * compiler token.
 */
export const CompilerToken = new InjectCompilerToken<ICompiler>('handle');

