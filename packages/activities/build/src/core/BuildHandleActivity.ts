import {
    HandleActivity, Task, IActivity,
    Expression, ActivityMetaAccessorToken
} from '@taskfr/core';
import {
    isRegExp, isString, isArray, Express, isFunction,
    Token, Providers, MetaAccessorToken
} from '@ts-ioc/core';
import { BuidActivityContext } from './BuidActivityContext';
import minimatch = require('minimatch');
import { CompilerToken } from './ICompiler';
import { BuildActivity } from './BuildActivity';
import { Inject, Injectable } from '@ts-ioc/core';
import { InputDataToken, InjectActivityContextToken } from '@taskfr/core';
import { NodeActivityContext } from './NodeActivity';
import { BuildHandleToken, BuildHandleConfigure } from './BuildHandle';
import { EmptyCompiler } from './CompilerActivity';


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
    { provide: MetaAccessorToken, useExisting: ActivityMetaAccessorToken },
    { provide: CompilerToken, useClass: EmptyCompiler }
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
        await this.buildCompiler(config);
        this.test = await this.toExpression(config.test);
        this.subDist = this.context.to(config.subDist) || '';
    }

    protected async buildCompiler(config: BuildHandleConfigure) {
        this.compiler = await this.buildActivity(config.compiler || CompilerToken);
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
        await this.execActivity(this.compiler, ctx);
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

    protected isValidContext(ctx: any): boolean {
        return ctx instanceof BuildHandleContext;
    }

    protected setResult(ctx?: any) {
        super.setResult(ctx);
        if (ctx instanceof BuidActivityContext) {
            this.context.builder = ctx.builder;
            this.context.origin = this;
            this.context.handle = this;
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
