import { IBuildHandleActivity, BuildHandleConfigure } from '../BuildHandle';
import {  ISourceCompiler, ICompiler, ISourcemapsCompiler, CompilerConfigure, InjectCompilerToken } from '../ICompiler';
import { Registration, ObjectMap } from '@ts-ioc/ioc';
import { IWatchActivity, WatchConfigure } from './IWatchActivity';
import { ExpressionToken, ConfigureType, CtxType, ExpressionType, Src } from '@ts-ioc/activities';

/**
 * asset activity.
 *
 * @export
 * @interface IAssetActivity
 * @extends {IBuildHandleActivity}
 */
export interface IAssetBuildHandle extends IBuildHandleActivity {
    /**
     * source compiler
     *
     * @type {ISourceCompiler}
     * @memberof AssetActivity
     */
    source: ISourceCompiler;
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
}

/**
 * inject asset activity token.
 *
 * @export
 * @class InjectAssetActivityToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectAssetToken<T extends IAssetBuildHandle> extends Registration<T> {
    constructor(desc: string) {
        super('AssetActivity', desc);
    }
}

/**
 * asset token.
 */
export const AssetToken = new InjectAssetToken<IAssetBuildHandle>('');


/**
 * dest type.
 */
export type DestType = string | CompilerConfigure;

/**
 * uglify configure.
 *
 * @export
 * @interface UglifyConfigure
 * @extends {CompilerConfigure}
 */
export interface UglifyConfigure extends CompilerConfigure {
    /**
     * uglify options.
     *
     * @type {CtxType<any>}
     * @memberof UglifyConfigure
     */
    uglifyOptions?: CtxType<any>;
}

/**
 * source map configure
 *
 * @export
 * @interface SourceMapsConfigure
 * @extends {ActivityConfigure}
 */
export interface SourceMapsConfigure extends CompilerConfigure {
    /**
     * sourcemaps.
     */
    sourcemaps?: CtxType<string>;
}

/**
 * source compiler.
 *
 * @export
 * @interface SourceConfigure
 * @extends {ITransformConfigure}
 */
export interface SourceConfigure extends CompilerConfigure {
    /**
     * transform source.
     *
     * @type {TransformSource}
     * @memberof ITransformConfigure
     */
    src?: ExpressionType<Src>;
}

/**
 * dest configure.
 *
 * @export
 * @interface DestConfigure
 * @extends {CompilerConfigure}
 */
export interface DestConfigure extends CompilerConfigure {
    /**
     * pipe dest.
     *
     * @type {ExpressionType<string>}
     * @memberof ITransformConfigure
     */
    dest?: ExpressionType<string>;
}

/**
 * Source Compiler
 */
export const SourceCompilerToken = new InjectCompilerToken<ISourceCompiler>('source');

/**
 * Sourcemaps Compiler
 */
export const SourcemapsCompilerToken = new InjectCompilerToken<ISourcemapsCompiler>('sourcemaps');

/**
 * annotation
 */
export const AnnotationCompilerToken = new InjectCompilerToken('annotation');


/**
 * Source Compiler
 */
export const DestCompilerToken = new InjectCompilerToken('dest');


/**
 *  uglify Compiler.
 */
export const UglifyCompilerToken = new InjectCompilerToken('uglify');

/**
 *
 *
 * @export
 * @interface AssetConfigure
 * @extends {SourceConfigure}
 * @extends {IDestConfigure}
 */
export interface AssetConfigure extends BuildHandleConfigure {
    /**
     * src config.
     *
     * @type {(ExpressionToken<Src> | ConfigureType<ISourceCompiler, SourceConfigure>>)}
     * @memberof AssetConfigure
     */
    src?: ExpressionToken<Src> | ConfigureType<ISourceCompiler, SourceConfigure>;
    /**
     * watch activity.
     *
     * @type {(ExpressionToken<Src | boolean> | ConfigureType<IWatchActivity, WatchConfigure>)}
     * @memberof AssetConfigure
     */
    watch?: ExpressionToken<Src | boolean> | ConfigureType<IWatchActivity, WatchConfigure>;

    /**
     * asset dest activity.
     *
     * @type {ConfigureType<ICompiler, CompilerConfigure>}
     * @memberof AssetConfigure
     */
    annotation?: ConfigureType<ICompiler, CompilerConfigure>;

    /**
     * asset dest activity.
     *
     * @type {(ExpressionToken<string> | ConfigureType<ICompiler, DestConfigure>)}
     * @memberof AssetConfigure
     */
    dest?: ExpressionToken<string> | ConfigureType<ICompiler, DestConfigure>;

    /**
     * uglify asset activity.
     *
     * @type {(ExpressionToken<boolean | ObjectMap<any>> | ConfigureType<ICompiler, UglifyConfigure>)}
     * @memberof AssetConfigure
     */
    uglify?: ExpressionToken<boolean | ObjectMap<any>> | ConfigureType<ICompiler, UglifyConfigure>;

    /**
     * create source map or not. default create source map at  `./sourcemaps` for js asset and ts asset.
     *
     * @type {(ExpressionToken<boolean | string> | ConfigureType<ISourcemapsCompiler, SourceMapsConfigure>)}
     * @memberof AssetConfigure
     */
    sourcemaps?: ExpressionToken<boolean | string> | ConfigureType<ISourcemapsCompiler, SourceMapsConfigure>;
}
