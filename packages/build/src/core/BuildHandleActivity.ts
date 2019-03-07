import {
    HandleActivity, Task, IActivity,
    Expression, ActivityMetaAccessorToken, IActivityContext, Src
} from '@ts-ioc/activities';
import {
    isRegExp, isString, isArray, Express, isFunction,
    Providers, lang, Inject, Injectable
} from '@ts-ioc/ioc';
import { BuidActivityContext } from './BuidActivityContext';
import minimatch = require('minimatch');
import { CompilerToken } from './ICompiler';
import { InputDataToken, InjectActivityContextToken } from '@ts-ioc/activities';
import { NodeActivityContext } from './NodeActivity';
import { BuildHandleToken, BuildHandleConfigure } from './BuildHandle';
import { EmptyCompiler } from './CompilerActivity';
import { MetaAccessor } from '@ts-ioc/bootstrap';


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
    { provide: MetaAccessor, useExisting: ActivityMetaAccessorToken },
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
        this.test = await this.toExpression(this.context.to(config.test));
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
        if (this.test && this.context.parent instanceof BuidActivityContext) {
            let bdrCtx = this.context.parent;
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

    protected initContext(ctx: BuildHandleContext<any>) {
        super.initContext(ctx);
        ctx.target = this;
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


    constructor(@Inject(InputDataToken) input: any) {
        super(input);
    }

    protected setConfig(config: BuildHandleConfigure, ctx?: IActivityContext) {
        this.config =  Object.assign({}, (ctx ? ctx.config : {}), config);
        this.config.title = '';
    }

    getBuilderContext(): BuidActivityContext {
        let node: IActivityContext = this;
        let ctx = null;
        while (!ctx && node) {
            if (node instanceof BuidActivityContext) {
                ctx = node;
            }
            node = node.parent;
        }
        return ctx;
    }

    getSrc(): Expression<Src> {
        let ctx = this.find(n => n.config && n.config.src);
        return ctx ? ctx.config.src : null;
    }

    getDist(): Expression<string> {
        let ctx = this.find(n => n.config && n.config.dest);
        return ctx ? ctx.config.dest : null;
    }
}
