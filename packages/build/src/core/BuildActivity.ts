import {
    ChainActivity, Task, ChainConfigure, CtxType, Src,
    ConfigureType, Active, IActivity, InjectAcitityToken,
    ActivityMetaAccessor, HandleType
} from '@ts-ioc/activities';
import { isBoolean, Token, Providers } from '@ts-ioc/ioc';
import { WatchActivity, WatchConfigure, WatchAcitvityToken } from './handles';
import { BuidActivityContext } from './BuidActivityContext';
import { BuildHandleConfigure, IBuildHandleActivity } from './BuildHandle';
import { MetaAccessor } from '@ts-ioc/boot';

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
     * @type {CtxType<(HandleType | BuildHandleConfigure | Token<IBuildHandleActivity>)[]>}
     * @memberof ChainConfigure
     */
    handles?: CtxType<(HandleType | BuildHandleConfigure | Token<IBuildHandleActivity>)[]>;

    /**
     * watch
     *
     * @type {CtxType<Src | boolean | ConfigureType<WatchActivity, WatchConfigure>>}
     * @memberof BuildConfigure
     */
    watch?: CtxType<Src | boolean | ConfigureType<WatchActivity, WatchConfigure>>;

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
    { provide: MetaAccessor, useClass: ActivityMetaAccessor }
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

    async onActivityInit(config: BuildConfigure) {
        await super.onActivityInit(config);
        this.src = this.context.to(config.src);
        let watch = this.context.to(config.watch);
        if (watch) {
            this.watch = await this.toActivity<Src | boolean, WatchActivity, WatchConfigure>(
                watch,
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
        await super.execute();
        await this.afterBuild();

    }

    protected async beforeBuild() {
        let cfg = this.context.config as BuildConfigure;
        if (cfg.before) {
            await this.execActivity(cfg.before, this.context);
        }
    }

    protected async afterBuild() {
        let cfg = this.context.config as BuildConfigure;
        if (cfg.after) {
            await this.execActivity(cfg.after, this.context);
        }
    }

    protected initContext(ctx: BuidActivityContext) {
        super.initContext(ctx);
        ctx.target = this;
    }
}
