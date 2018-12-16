import {
    HandleActivity, Active, Task, ExpressionType, IActivity,
    Expression, HandleConfigure, CtxType, InjectAcitityToken, ActivityMetaAccessorToken
} from '@taskfr/core';
import { isRegExp, isString, isArray, Express, isFunction, lang, InjectReference, Token, Providers, MetaAccessorToken } from '@ts-ioc/core';
import { BuidActivityContext } from './BuidActivityContext';
import minimatch = require('minimatch');
import { CompilerToken, InjectCompilerToken } from './BuildHandle';
import { BuildActivity } from './BuildActivity';
import { Inject, Injectable, Refs } from '@ts-ioc/core';
import { InputDataToken, InjectActivityContextToken, ActivityContextToken } from '@taskfr/core';
import { NodeActivityContext } from './NodeActivity';


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
@Providers([
    { provide: MetaAccessorToken, useExisting: ActivityMetaAccessorToken }
])
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
            this.compiler = this.container.getService(CompilerToken, lang.getClass(this), tk => new InjectCompilerToken(tk));
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
        if (this.test && this.context.builder) {
            let bdrCtx = this.context.builder.context;
            if (bdrCtx.isCompleted()) {
                return;
            }
            let test = await this.context.exec(this, this.test);
            let files: string[];

            if (isArray(this.context.result)) {
                if (isString(test)) {
                    files = bdrCtx.result.filter(f => minimatch(f, test as string));
                } else if (isFunction(test)) {
                    files = bdrCtx.result.filter(test);
                } else if (isRegExp(test)) {
                    files = bdrCtx.result.filter(f => (<RegExp>test).test(f));
                }
            }
            if (!files || files.length < 1) {
                await this.compile(this.context);
                bdrCtx.complete(files);
            }
        } else {
            await this.compile(this.context);
        }
    }

    /**
     * compile.
     *
     * @protected
     * @param {BuildHandleContext<any>} ctx
     * @memberof BuildHandleActivity
     */
    protected async compile(ctx: BuildHandleContext<any>) {
        await this.compiler.run(ctx);
    }

    /**
     * create context.
     *
     * @param {*} [data]
     * @param {Token<IActivity>} [type]
     * @param {Token<any>} [defCtx]
     * @returns {BuildHandleContext<any>}
     * @memberof BuildHandleActivity
     */
    createContext(data?: any, type?: Token<IActivity>, defCtx?: Token<any>): BuildHandleContext<any> {
        let context = super.createContext(data, type, defCtx) as BuildHandleContext<any>;
        if (this.context) {
            context.builder = this.context.builder;
            context.origin = this.context.origin;
            context.handle = this.context.handle || this;
        } else {
            context.handle = this;
        }
        return context;
    }

    protected verifyCtx(ctx?: any) {
        if (ctx instanceof BuildHandleContext) {
            this.context = ctx;
        } else {
            this.setResult(ctx);
            if (ctx instanceof BuidActivityContext) {
                this.context.builder = ctx.builder;
                this.context.origin = this;
                this.context.handle = this;
            }
        }
    }
}

/**
 * compiler context token.
 */
export const HandleContextToken = new InjectActivityContextToken(BuildHandleActivity);

/**
 * build handle activity context.
 *
 * @export
 * @class BuidHandleActivityContext
 * @extends {NodeActivityContext}
 */
@Injectable(HandleContextToken)
@Refs(CompilerToken, ActivityContextToken)
export class BuildHandleContext<T> extends NodeActivityContext<T> {

    /**
     * origin build handle
     *
     * @type {BuildHandleActivity}
     * @memberof BuildHandleContext
     */
    origin: BuildHandleActivity;
    /**
     * the builder
     *
     * @type {BuildActivity}
     * @memberof BuidActivityContext
     */
    builder: BuildActivity;
    /**
     * build handle.
     *
     * @type {BuildHandleActivity}
     * @memberof CompilerContext
     */
    handle: BuildHandleActivity;

    constructor(@Inject(InputDataToken) input: any) {
        super(input);
    }
}
