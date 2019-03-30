import { BuildHandleConfigure, IBuildHandleActivity } from '../BuildHandle';
import { ExpressionType, Src, CtxType, InjectAcitityToken, IActivity } from '@tsdi/activities';
import { InjectCompilerToken } from '../ICompiler';


export interface ITestActivity extends IBuildHandleActivity {

}

/**
 * test activity configure.
 *
 * @export
 * @interface TestConfigure
 * @extends {SourceConfigure}
 */
export interface TestConfigure extends BuildHandleConfigure {
    /**
     * test source.
     *
     * @type {TransformSource}
     * @memberof ITransformConfigure
     */
    src: ExpressionType<Src>;

    /**
     * set match test file source.
     *
     * @type {ExpressionType<boolean>}
     * @memberof TestConfigure
     */
    enable?: ExpressionType<boolean>;
    /**
     * test options.
     *
     * @type {CtxType<any>}
     * @memberof TestConfigure
     */
    options?: CtxType<any>;
}

/**
 * test activity token.
 */
export const TestToken = new InjectAcitityToken<IActivity>('test');

/**
 * test compiler
 */
export const TestCompilerToken = new InjectCompilerToken(TestToken);
