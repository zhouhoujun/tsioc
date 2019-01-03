import { BuildHandleActivity, BuildHandleContext } from '../BuildHandleActivity';
import { Src, Task } from '@taskfr/core';
import {
    ICompiler, ISourcemapsCompiler, ISourceCompiler, CompilerConfigure,
    IAnnotationCompiler, IDestCompiler
} from '../ICompiler';
import {
    AssetConfigure, SourceConfigure, SourceCompilerToken, DestConfigure, DestCompilerToken,
    UglifyConfigure, UglifyCompilerToken, SourceMapsConfigure,
    SourcemapsCompilerToken, AnnotationCompilerToken, IAssetBuildHandle
} from './IAssetBuildHandle';
import { isBoolean, isToken } from '@ts-ioc/core';
import { CompilerActivity } from '../CompilerActivity';

@Task
export class AssetBuildHanlde<T extends BuildHandleContext<any>> extends BuildHandleActivity implements IAssetBuildHandle {
    // /**
    //  * source compiler
    //  *
    //  * @type {ISourceCompiler}
    //  * @memberof AssetActivity
    //  */
    // src: ISourceCompiler;
    // /**
    //  * asset annotation.
    //  *
    //  * @type {AnnotationActivity}
    //  * @memberof AssetActivity
    //  */
    // annotation: ICompiler;
    /**
     * source maps compiler.
     *
     * @type {SourceMapsActivity}
     * @memberof AssetActivity
     */
    sourcemaps: ISourcemapsCompiler;
    // /**
    //  * uglify compiler
    //  *
    //  * @type {ICompiler}
    //  * @memberof AssetActivity
    //  */
    // uglify: ICompiler;

    // /**
    //  * dest compiler.
    //  *
    //  * @type {IDestCompiler}
    //  * @memberof AssetActivity
    //  */
    // dest: IDestCompiler;

    /**
     * build handle context.
     *
     * @type {T}
     * @memberof AssetActivity
     */
    context: T;

    protected async compile(ctx: T): Promise<void> {
        await this.execSource(ctx);
        await this.execAnnotation(ctx);
        await this.execSourcemapsInit(ctx);
        await this.execCompiler(ctx);
        await this.execUglify(ctx);
        await this.execDest(ctx);
    }

    protected async execSource(ctx: T) {
        let config = ctx.config as AssetConfigure;
        if (config.src) {
            let src = await this.toActivity<Src, ISourceCompiler, SourceConfigure>(config.src,
                act => act instanceof CompilerActivity,
                src => {
                    if (!src) {
                        return { activity: SourceCompilerToken };
                    }
                    return { src: src, activity: SourceCompilerToken };
                });
            await this.execActivity(src, ctx);
        }
    }

    protected async execAnnotation(ctx: T) {
        let config = ctx.config as AssetConfigure;
        if (config.annotation) {
            let annotation = await this.toActivity<boolean | string, IAnnotationCompiler, CompilerConfigure>(config.annotation,
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

            await this.execActivity(annotation, ctx);
        }
    }

    protected async execSourcemapsInit(ctx: T) {
        let config = ctx.config as AssetConfigure;
        if (config.sourcemaps) {
            this.sourcemaps = await this.toActivity<boolean | string, ISourcemapsCompiler, SourceMapsConfigure>(config.sourcemaps,
                act => act instanceof CompilerActivity,
                sourcemaps => {
                    if (isBoolean(sourcemaps)) {
                        if (sourcemaps) {
                            return { activity: SourcemapsCompilerToken };
                        }
                        return null;
                    }
                    return { sourcemaps: sourcemaps, activity: SourcemapsCompilerToken };
                });

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
        let config = ctx.config as AssetConfigure;
        if (config.uglify) {
            let uglifyAct = await this.toActivity<any, CompilerActivity, UglifyConfigure>(config.uglify,
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

            await this.execActivity(uglifyAct, ctx);
        }
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
        let config = ctx.config as AssetConfigure;
        await this.execActivity(this.sourcemaps, ctx);
        if (config.dest) {
            let dest = await this.toActivity<string, IDestCompiler, DestConfigure>(config.dest,
                act => act instanceof CompilerActivity,
                dest => {
                    if (!dest) {
                        return { activity: DestCompilerToken };
                    }
                    return { dest: dest, activity: DestCompilerToken };
                });
            await this.execActivity(dest, ctx);
        }
    }
}

