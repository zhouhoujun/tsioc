import { IHandleActivity, IActivity, Expression } from '@taskfr/core';
import { Express, Registration, Token } from '@ts-ioc/core';

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
     * @type {IActivity}
     * @memberof IBuildHandleActivity
     */
    compiler: IActivity;

    /**
     * test files macth or not to deal with.
     *
     * @type {(Expression<string | RegExp | Express<string, boolean>>)}
     * @memberof IBuildHandleActivity
     */
    test: Expression<string | RegExp | Express<string, boolean>>;
}

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

