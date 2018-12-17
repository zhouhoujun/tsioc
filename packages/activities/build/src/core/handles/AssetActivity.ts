import { BuildHandleActivity, BuildHandleContext } from '../BuildHandleActivity';
import { Src } from '@taskfr/core';
import { ICompiler, ISourcemapsCompiler, ISourceCompiler } from '../BuildHandle';
import { AssetConfigure, SourceConfigure, SourceCompilerToken, DestConfigure, DestCompilerToken, UglifyConfigure, UglifyCompilerToken, SourceMapsConfigure, SourcemapsCompilerToken } from './AssetConfigure';
import { lang, isBoolean } from '@ts-ioc/core';
import { CompilerActivity } from '../CompilerActivity';
import { WatchActivity, WatchConfigure, WatchAcitvityToken } from './WatchActivity';
import { Asset } from '../../decorators';
import { AssetToken } from './IAssetActivity';

@Asset(AssetToken)
export class AssetActivity extends BuildHandleActivity {
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
     * @type {ICompiler}
     * @memberof AssetActivity
     */
    dest: ICompiler;

    /**
     * watch activity.
     *
     * @type {WatchActivity}
     * @memberof AssetActivity
     */
    watch: WatchActivity;

    async onActivityInit(config: AssetConfigure) {
        await super.onActivityInit(config);
        if (config.annotation) {
            this.annotation = await this.buildActivity(config.annotation);
        }

        if (config.src) {
            this.src = await this.toActivity<Src, ISourceCompiler, SourceConfigure>(config.src,
                act => act instanceof CompilerActivity,
                src => {
                    if (!src) {
                        return null;
                    }
                    return { src: src, task: SourceCompilerToken };
                });
        }

        if (config.sourcemaps) {
            this.sourcemaps = await this.toActivity<boolean | string, ISourcemapsCompiler, SourceMapsConfigure>(config.sourcemaps,
                act => act instanceof CompilerActivity,
                sourcemaps => {
                    if (isBoolean(sourcemaps)) {
                        if (sourcemaps) {
                            return { sourcemaps: '', task: SourcemapsCompilerToken };
                        }
                        return null;
                    }
                    return { sourcemaps: sourcemaps, task: SourcemapsCompilerToken };
                });
        }


        if (config.dest) {
            this.dest = await this.toActivity<string, CompilerActivity, DestConfigure>(config.dest,
                act => act instanceof CompilerActivity,
                dest => {
                    if (!dest) {
                        return null;
                    }
                    return { dest: dest, task: DestCompilerToken };
                });
        }

        if (config.uglify) {
            this.uglify = await this.toActivity<any, CompilerActivity, UglifyConfigure>(config.uglify,
                act => act instanceof CompilerActivity,
                uglify => {
                    if (isBoolean(uglify)) {
                        if (uglify) {
                            return { task: UglifyCompilerToken };
                        }
                        return null;
                    }
                    return <UglifyConfigure>{ uglifyOptions: uglify, task: UglifyCompilerToken };
                });
        }

        if (config.watch) {
            this.watch = await this.toActivity<Src | boolean, WatchActivity, WatchConfigure>(config.watch,
                act => act instanceof WatchActivity,
                watch => {
                    if (isBoolean(watch)) {
                        if (watch && this.src) {
                            return <WatchConfigure>{ src: this.src.getSource(), task: WatchAcitvityToken };
                        }
                        return null;
                    }
                    return <WatchConfigure>{ src: watch, task: WatchAcitvityToken };
                });
        }
    }

    protected async compile(ctx: BuildHandleContext<any>): Promise<void> {
        await this.execWatch(ctx);
        await this.execAnnotation(ctx);
        await this.execSourcemapsInit(ctx);
        await this.execCompiler(ctx);
        await this.execUglify(ctx);
        await this.execDest(this.dest, ctx);
    }

    protected async execWatch(ctx: BuildHandleContext<any>) {
        if (!(this.watch && ctx.target === this.watch)) {
            if (this.src) {
                await this.src.run(ctx);
            }
            if (this.watch) {
                this.watch.body = this;
                let watchCtx = this.createContext();
                watchCtx.target = this.watch;
                this.watch.run(watchCtx);
            }
        }
    }

    protected async execAnnotation(ctx: BuildHandleContext<any>) {
        if (this.annotation) {
            await this.annotation.run(ctx);
        }
    }

    protected async execSourcemapsInit(ctx: BuildHandleContext<any>) {
        if (this.sourcemaps) {
            ctx.sourceMaps = this.sourcemaps;
            await this.sourcemaps.init(ctx);
        }
    }

    protected async execCompiler(ctx: BuildHandleContext<any>) {
        await this.compiler.run(ctx);
    }

    /**
     * execute uglify.
     *
     * @protected
     * @param {TransformActivityContext} ctx
     * @returns
     * @memberof AssetActivity
     */
    protected async execUglify(ctx: BuildHandleContext<any>) {
        if (this.uglify) {
            await this.uglify.run(ctx);
        }
    }

    /**
     * execute dest activity.
     *
     * @protected
     * @param {DestActivity} ds
     * @param {TransformActivityContext} ctx
     * @returns
     * @memberof AssetActivity
     */
    protected async execDest(ds: ICompiler, ctx: BuildHandleContext<any>) {
        if (!ds) {
            return;
        }
        await ds.run(ctx);
    }
}
