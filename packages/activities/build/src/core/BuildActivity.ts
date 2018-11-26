import { ChainActivity, Task, ChainConfigure, CtxType, Src, ExpressionToken, ConfigureType, Active, IActivity, ActivityContext, InjectAcitityToken } from '@taskfr/core';
import { isBoolean, Token } from '@ts-ioc/core';
import { WatchActivity, WatchConfigure } from './activities';
import { BuidActivityContext } from './BuidActivityContext';
import { BuildHandleConfigure, BuildHandleActivity } from './BuildHandleActivity';

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
    handles?: (BuildHandleConfigure | Token<BuildHandleActivity>)[];

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
    beforeBuildBody?: Active;

    /**
     * do sth, after build completed.
     *
     * @type {Active}
     * @memberof BuildConfigure
     */
    afterBuildBody?: Active;
}

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
    beforeBuildBody: IActivity;

    /**
     * do sth, after build completed.
     *
     * @type {IActivity}
     * @memberof BuildActivity
     */
    afterBuildBody: IActivity;
}

/**
 * build activity.
 *
 * @export
 * @class BuildActivity
 * @extends {ChainActivity}
 */
@Task(BuildToken)
export class BuildActivity extends ChainActivity implements IBuildActivity {

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
    beforeBuildBody: IActivity;

    /**
     * do sth, after build completed.
     *
     * @type {IActivity}
     * @memberof BuildActivity
     */
    afterBuildBody: IActivity;

    async onActivityInit(config: BuildConfigure) {
        await super.onActivityInit(config);
        this.src = this.getContext().to(config.src);
        if (config.watch) {
            this.watch = await this.toActivity<Src | boolean, WatchActivity, WatchConfigure>(
                config.watch,
                act => act instanceof WatchActivity,
                watch => {
                    if (isBoolean(watch)) {
                        if (watch && this.src) {
                            return <WatchConfigure>{ src: this.src, task: WatchActivity };
                        }
                        return null;
                    }
                    return <WatchConfigure>{ src: watch, task: WatchActivity };
                });
        }

        if (config.beforeBuildBody) {
            this.beforeBuildBody = await this.buildActivity(config.beforeBuildBody);
        }
        if (config.afterBuildBody) {
            this.afterBuildBody = await this.buildActivity(config.afterBuildBody);
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
        if (this.watch) {
            this.watch.body = this;
            let watchCtx = this.getCtxFactory().create();
            watchCtx.target = this.watch;
            this.watch.run(watchCtx);
        }
        await this.getInputFiles(this.getContext());
    }

    getContext(): BuidActivityContext {
        return super.getContext() as BuidActivityContext;
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
        let ctx = this.getContext();
        if (!(this.watch && ctx.target === this.watch)) {
            await this.execOnce();
        }
        await this.execBeforeBody();
        await this.handleRequest(this.getContext());
        await this.execAfterBody();

    }

    protected async execBeforeBody() {
        if (this.beforeBuildBody) {
            await this.beforeBuildBody.run(this.getContext());
        }
    }

    protected async execAfterBody() {
        if (this.afterBuildBody) {
            await this.afterBuildBody.run(this.getContext());
        }
    }

    protected verifyCtx(ctx?: any) {
        if (ctx instanceof ActivityContext) {
            this._ctx = ctx;
        } else {
            this.getContext().setAsResult(ctx);
        }
        this.getContext().builder = this;
    }
}
