import { BuildHandleActivity, BuildHandleContext } from '../BuildHandleActivity';
import { Src } from '@taskfr/core';
import { ICompiler, ISourcemapsCompiler, ISourceCompiler, CompilerConfigure, IAnnotationCompiler, IDestCompiler } from '../ICompiler';
import {
    AssetConfigure, SourceConfigure, SourceCompilerToken, DestConfigure, DestCompilerToken,
    UglifyConfigure, UglifyCompilerToken, SourceMapsConfigure, SourcemapsCompilerToken, AssetToken, AnnotationCompilerToken
} from './IAssetActivity';
import { isBoolean, isToken } from '@ts-ioc/core';
import { CompilerActivity } from '../CompilerActivity';
import { IWatchActivity, WatchConfigure, WatchAcitvityToken } from './IWatchActivity';
import { Asset } from '../../decorators';
import { WatchActivity } from './WatchActivity';

@Asset(AssetToken)
export class AssetActivity<T extends BuildHandleContext<any>> extends BuildHandleActivity {
    /**
     * source compiler
     *
     * @type {ISourceCompiler}
     * @memberof AssetActivity
     */
    src: ISourceCompiler;
    /**
     * asset annotation.
     *
     * @type {AnnotationActivity}
     * @memberof AssetActivity
     */
    annotation: ICompiler;
    /**
     * source maps compiler.
     *
     * @type {SourceMapsActivity}
     * @memberof AssetActivity
     */
    sourcemaps: ISourcemapsCompiler;
    /**
     * uglify compiler
     *
     * @type {ICompiler}
     * @memberof AssetActivity
     */
    uglify: ICompiler;

    /**
     * dest compiler.
     *
     * @type {IDestCompiler}
     * @memberof AssetActivity
     */
    dest: IDestCompiler;

    /**
     * watch activity.
     *
     * @type {WatchActivity}
     * @memberof AssetActivity
     */
    watch: IWatchActivity;

    /**
     * build handle context.
     *
     * @type {T}
     * @memberof AssetActivity
     */
    context: T;

    async onActivityInit(config: AssetConfigure) {
        await super.onActivityInit(config);
        if (config.annotation) {
            this.annotation = await this.toActivity<boolean | string, IAnnotationCompiler, CompilerConfigure>(config.annotation,
                act => act instanceof CompilerActivity,
                ann => {
                    if (isBoolean(ann)) {
                        if (ann) {
                            return { activity: AnnotationCompilerToken };
                        }
                        return null;
                    }
                    if (isToken(ann)) {
                        return { activity: ann }
                    }
                    return ann;
                });
        }

        if (config.src) {
            this.src = await this.toActivity<Src, ISourceCompiler, SourceConfigure>(config.src,
                act => act instanceof CompilerActivity,
                src => {
                    if (!src) {
                        return null;
                    }
                    return { src: src, token: SourceCompilerToken };
                });
        }

        if (config.sourcemaps) {
            this.sourcemaps = await this.toActivity<boolean | string, ISourcemapsCompiler, SourceMapsConfigure>(config.sourcemaps,
                act => act instanceof CompilerActivity,
                sourcemaps => {
                    if (isBoolean(sourcemaps)) {
                        if (sourcemaps) {
                            return { sourcemaps: '', activity: SourcemapsCompilerToken };
                        }
                        return null;
                    }
                    return { sourcemaps: sourcemaps, activity: SourcemapsCompilerToken };
                });
        }

        if (config.dest) {
            this.dest = await this.toActivity<string, IDestCompiler, DestConfigure>(config.dest,
                act => act instanceof CompilerActivity,
                dest => {
                    if (!dest) {
                        return null;
                    }
                    return { dest: dest, activity: DestCompilerToken };
                });
        }

        if (config.uglify) {
            this.uglify = await this.toActivity<any, CompilerActivity, UglifyConfigure>(config.uglify,
                act => act instanceof CompilerActivity,
                uglify => {
                    if (isBoolean(uglify)) {
                        if (uglify) {
                            return { activity: UglifyCompilerToken };
                        }
                        return null;
                    }
                    return <UglifyConfigure>{ uglifyOptions: uglify, activity: UglifyCompilerToken };
                });
        }

        if (config.watch) {
            this.watch = await this.toActivity<Src | boolean, WatchActivity, WatchConfigure>(config.watch,
                act => act instanceof WatchActivity,
                watch => {
                    if (isBoolean(watch)) {
                        if (watch && this.src) {
                            return <WatchConfigure>{ src: this.src.getSource(), activity: WatchAcitvityToken };
                        }
                        return null;
                    }
                    return <WatchConfigure>{ src: watch, activity: WatchAcitvityToken };
                });
        }
    }

    protected async compile(ctx: T): Promise<void> {
        await this.execSource(ctx);
        await this.execAnnotation(ctx);
        await this.execSourcemapsInit(ctx);
        await this.execCompiler(ctx);
        await this.execUglify(ctx);
        await this.execDest(ctx);
    }

    protected async execSource(ctx: T) {
        if (!(this.watch && ctx.target === this.watch)) {
            await this.execActivity(this.src, ctx);
            await this.execActivity(this.watch, () => {
                this.watch.body = this;
                let watchCtx = this.createContext();
                watchCtx.target = this.watch;
                return watchCtx;
            });
        }
    }

    protected async execAnnotation(ctx: T) {
        await this.execActivity(this.annotation, ctx);
    }

    protected async execSourcemapsInit(ctx: T) {
        if (this.sourcemaps) {
            await this.sourcemaps.init(ctx);
        }
    }

    protected async execCompiler(ctx: T) {
        await this.execActivity(this.compiler, ctx);
    }

    /**
     * execute uglify.
     *
     * @protected
     * @param {T} ctx
     * @returns
     * @memberof AssetActivity
     */
    protected async execUglify(ctx: T) {
        await this.execActivity(this.uglify, ctx);
    }

    /**
     * execute dest activity.
     *
     * @protected
     * @param {T} ctx
     * @returns
     * @memberof AssetActivity
     */
    protected async execDest(ctx: T) {
        await this.execActivity(this.sourcemaps, ctx);
        await this.execActivity(this.dest, ctx);
    }
}
