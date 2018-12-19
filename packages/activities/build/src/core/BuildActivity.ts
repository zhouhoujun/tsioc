import {
    ChainActivity, Task, ChainConfigure, CtxType, Src,
    ExpressionToken, ConfigureType, Active, IActivity, InjectAcitityToken, ActivityMetaAccessorToken
} from '@taskfr/core';
import { isBoolean, Token, Providers, MetaAccessorToken } from '@ts-ioc/core';
import { WatchActivity, WatchConfigure, WatchAcitvityToken } from './handles';
import { BuidActivityContext } from './BuidActivityContext';
import { BuildHandleConfigure, IBuildHandleActivity } from './BuildHandle';

/**
 * builder configure.
 *
 * @export
 * @interface BuildConfigure
 * @extends {ChainConfigure}
 */
export interface BuildConfigure extends ChainConfigure {
    /**
     * src root.
     *
     * @type {CtxType<Src>}
     * @memberof BuildConfigure
     */
    src?: CtxType<Src>;

    /**
     * build dist.
     *
     * @type {CtxType<string>}
     * @memberof BuildConfigure
     */
    dist?: CtxType<string>;

    /**
     * handle activities.
     *
     * @type {(BuildHandleConfigure | Token<BuildHandleActivity>)[];}
     * @memberof ChainConfigure
     */
    handles?: (BuildHandleConfigure | Token<IBuildHandleActivity>)[];

    /**
     * watch
     *
     * @type {(ExpressionToken<Src | boolean> | ConfigureType<WatchActivity, WatchConfigure>)}
     * @memberof BuildConfigure
     */
    watch?: ExpressionToken<Src | boolean> | ConfigureType<WatchActivity, WatchConfigure>;

    /**
     * before build activity.
     *
     * @type {Active}
     * @memberof BuildConfigure
     */
    before?: Active;

    /**
     * do sth, after build completed.
     *
     * @type {Active}
     * @memberof BuildConfigure
     */
    after?: Active;
}

/**
 * build token.
 */
export const BuildToken = new InjectAcitityToken<BuildActivity>('build');

/**
 * IBuildActivity
 *
 * @export
 * @interface IBuildActivity
 * @extends {IActivity}
 */
export interface IBuildActivity extends IActivity {
    /**
     * build context.
     *
     * @type {BuidActivityContext}
     * @memberof IBuildActivity
     */
    context: BuidActivityContext;
    /**
     * build src root.
     *
     * @type {Src}
     * @memberof BuildActivity
     */
    src: Src;
    /**
     * build dist.
     *
     * @type {string}
     * @memberof BuildActivity
     */
    dist: string;
    /**
     * watch activity. watch the build.
     *
     * @type {WatchActivity}
     * @memberof BuildActivity
     */
    watch: WatchActivity;
    /**
     * before build body.
     *
     * @type {IActivity}
     * @memberof BuildActivity
     */
    before: IActivity;
    /**
     * do sth, after build completed.
     *
     * @type {IActivity}
     * @memberof BuildActivity
     */
    after: IActivity;
}

/**
 * build activity.
 *
 * @export
 * @class BuildActivity
 * @extends {ChainActivity}
 */
@Task(BuildToken)
@Providers([
    { provide: MetaAccessorToken, useExisting: ActivityMetaAccessorToken }
])
export class BuildActivity extends ChainActivity implements IBuildActivity {
    /**
     * build context.
     *
     * @type {BuidActivityContext}
     * @memberof BuildActivity
     */
    context: BuidActivityContext;
    /**
     * build src root.
     *
     * @type {Src}
     * @memberof BuildActivity
     */
    src: Src;
    /**
     * build dist.
     *
     * @type {string}
     * @memberof BuildActivity
     */
    dist: string;
    /**
     * watch activity. watch the build.
     *
     * @type {WatchActivity}
     * @memberof BuildActivity
     */
    watch: WatchActivity;
    /**
     * before build body.
     *
     * @type {IActivity}
     * @memberof BuildActivity
     */
    before: IActivity;
    /**
     * do sth, after build completed.
     *
     * @type {IActivity}
     * @memberof BuildActivity
     */
    after: IActivity;

    async onActivityInit(config: BuildConfigure) {
        await super.onActivityInit(config);
        this.src = this.context.to(config.src);
        if (config.watch) {
            this.watch = await this.toActivity<Src | boolean, WatchActivity, WatchConfigure>(
                config.watch,
                act => act instanceof WatchActivity,
                watch => {
                    if (isBoolean(watch)) {
                        if (watch && this.src) {
                            return <WatchConfigure>{ src: this.src, activity: WatchAcitvityToken };
                        }
                        return null;
                    }
                    return <WatchConfigure>{ src: watch, activity: WatchAcitvityToken };
                });
        }

        if (config.before) {
            this.before = await this.buildActivity(config.before);
        }
        if (config.after) {
            this.after = await this.buildActivity(config.after);
        }
    }

    /**
     * execute once build action.
     *
     * @protected
     * @param {BuidActivityContext} ctx
     * @returns {Promise<void>}
     * @memberof BuildActivity
     */
    protected async execOnce(): Promise<void> {
        await this.execActivity(this.watch, () => {
            this.watch.body = this;
            let watchCtx = this.createContext();
            watchCtx.target = this.watch;
            return watchCtx;
        });
        await this.getInputFiles(this.context);
    }

    /**
     * get input files.
     *
     * @protected
     * @param {BuidActivityContext} ctx
     * @memberof BuildActivity
     */
    protected async getInputFiles(ctx: BuidActivityContext) {
        if (this.src) {
            let src = await ctx.getFiles(this.src);
            ctx.setAsResult(src);
        }
    }

    /**
     * execute build action.
     *
     * @protected
     * @param {BuidActivityContext} ctx
     * @returns {Promise<void>}
     * @memberof BuildActivity
     */
    protected async execute(): Promise<void> {
        let ctx = this.context;
        if (!(this.watch && ctx.target === this.watch)) {
            await this.execOnce();
        }
        await this.beforeBuild();
        await this.handleRequest(this.context);
        await this.afterBuild();

    }

    protected async beforeBuild() {
        await this.execActivity(this.before, this.context);
    }

    protected async afterBuild() {
        await this.execActivity(this.after, this.context);
    }

    protected verifyCtx(ctx?: any) {
        if (ctx instanceof BuidActivityContext) {
            this.context = ctx;
        } else {
            this.setResult(ctx);
            this.context.builder = this;
        }
    }
}
