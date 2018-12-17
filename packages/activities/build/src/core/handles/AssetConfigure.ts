import { Src, ExpressionToken, ConfigureType, CtxType, ExpressionType } from '@taskfr/core';
import { ObjectMap } from '@ts-ioc/core';
import { CompilerConfigure } from '../CompilerActivity';
import { BuildHandleConfigure } from '../BuildHandleActivity';
import { ICompiler, InjectCompilerToken, ISourcemapsCompiler, ISourceCompiler } from '../BuildHandle';
import { WatchConfigure, WatchActivity } from './WatchActivity';

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
    src: ExpressionType<Src>;
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
     * @type {(ExpressionToken<Src | boolean> | ConfigureType<WatchActivity, WatchConfigure>)}
     * @memberof AssetConfigure
     */
    watch?: ExpressionToken<Src | boolean> | ConfigureType<WatchActivity, WatchConfigure>;

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
