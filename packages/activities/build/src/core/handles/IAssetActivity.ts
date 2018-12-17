import { IBuildHandleActivity, ISourceCompiler, ICompiler, ISourcemapsCompiler } from '../BuildHandle';
import { WatchActivity } from './WatchActivity';
import { Registration } from '@ts-ioc/core';

/**
 * asset activity.
 *
 * @export
 * @interface IAssetActivity
 * @extends {IBuildHandleActivity}
 */
export interface IAssetActivity extends IBuildHandleActivity {
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
}

/**
 * inject asset activity token.
 *
 * @export
 * @class InjectAssetActivityToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectAssetToken<T extends IAssetActivity> extends Registration<T> {
    constructor(desc: string) {
        super('AssetActivity', desc);
    }
}

/**
 * asset token.
 */
export const AssetToken = new InjectAssetToken<IAssetActivity>('');
