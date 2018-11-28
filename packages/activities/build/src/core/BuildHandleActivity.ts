import {
    HandleActivity, Active, Task, ExpressionType, IActivity,
    Expression, HandleConfigure, CtxType, InjectAcitityToken
} from '@taskfr/core';
import { isRegExp, isString, isArray, Express, isFunction, lang, InjectReference } from '@ts-ioc/core';
import { BuidActivityContext } from './BuidActivityContext';
import minimatch = require('minimatch');
import { CompilerToken, InjectCompilerToken } from './BuildHandle';
import { BuildHandleContext } from './BuildHandleContext';


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

export const BuildHandleToken = new InjectAcitityToken<BuildHandleActivity>('build-handle');

/**
 * build handle activity.
 *
 * @export
 * @abstract
 * @class BuildHandleActivity
 * @extends {HandleActivity}
 */
@Task(BuildHandleToken)
export class BuildHandleActivity extends HandleActivity {

    /**
     * build handle context.
     *
     * @type {BuildHandleContext<any>}
     * @memberof BuildHandleActivity
     */
    context: BuildHandleContext<any>;

    /**
     * compiler.
     *
     * @type {IActivity}
     * @memberof BuildHandleActivity
     */
    compiler: IActivity;

    /**
     * sub dist.
     *
     * @type {string}
     * @memberof BuildHandleActivity
     */
    subDist: string;

    /**
     * file filter.
     *
     * @type {Expression<string | RegExp | Express<string, boolean>>}
     * @memberof BuildHandleActivity
     */
    test: Expression<string | RegExp | Express<string, boolean>>;

    async onActivityInit(config: BuildHandleConfigure) {
        await super.onActivityInit(config);
        if (config.compiler) {
            this.compiler = await this.buildActivity(config.compiler);
        } else {
            this.compiler = this.container.getRefService([
                tk => new InjectCompilerToken(tk),
                tk => new InjectReference(CompilerToken, tk)
            ], lang.getClass(this));
        }
        this.test = await this.toExpression(config.test);
        this.subDist = this.context.to(config.subDist) || '';
    }

    /**
     * handle build via files.
     *
     * @protected
     * @param {() => Promise<any>} [next]
     * @returns {Promise<void>}
     * @memberof BuildHandleActivity
     */
    protected async execute(next?: () => Promise<any>): Promise<void> {
        let ctx = this.context;
        if (!this.test) {
            await this.compile(ctx);
        } else {
            let bdrCtx = ctx.builder.context;
            if (bdrCtx.isCompleted()) {
                return;
            }
            let test = await ctx.exec(this, this.test);
            let files: string[];

            if (isArray(ctx.result)) {
                if (isString(test)) {
                    files = bdrCtx.result.filter(f => minimatch(f, test as string));
                } else if (isFunction(test)) {
                    files = bdrCtx.result.filter(test);
                } else if (isRegExp(test)) {
                    files = bdrCtx.result.filter(f => (<RegExp>test).test(f));
                }
            }
            if (!files || files.length < 1) {
                await this.compile(ctx);
                bdrCtx.complete(files);
            }
        }
    }

    protected async compile(ctx: BuildHandleContext<any>) {
        await this.compiler.run(ctx);
    }

    protected verifyCtx(ctx?: any) {
        this.setResult(ctx);
        if (ctx instanceof BuidActivityContext) {
            this.context.builder = ctx.builder;
            this.context.origin = this;
        } else if (ctx instanceof BuildHandleContext) {
            this.context.builder = ctx.builder;
            this.context.origin = ctx.origin
        }
        this.context.handle = this;
    }
}
