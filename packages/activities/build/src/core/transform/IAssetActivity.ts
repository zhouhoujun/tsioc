import { InjectAcitityBuilderToken } from '@taskfr/core';
import { Registration } from '@ts-ioc/core';
import { AnnotationsConfigure, AnnotationActivity } from './Annotation';
import { UglifyActivity } from '../activities/UglifyActivity';
import { ITransformActivity } from './ITransformActivity';
import { SourceActivity } from './SourceActivity';
import { DestActivity } from './DestActivity';
import { WatchActivity } from '../activities';
import { SourceMapsActivity } from './SourceMapsActivity';


/**
 * asset activity.
 *
 * @export
 * @interface IAssetActivity
 * @extends {ITransformActivity}
 */
export interface IAssetActivity extends ITransformActivity {

    /**
     * src activity.
     *
     * @type {SourceActivity}
     * @memberof AssetActivity
     */
    src: SourceActivity;

    /**
     * dest activity.
     *
     * @type {(DestActivity | DestActivity[])}
     * @memberof AssetActivity
     */
    dest: DestActivity | DestActivity[];

    /**
     * watch activity.
     *
     * @type {WatchActivity}
     * @memberof AssetActivity
     */
    watch: WatchActivity;

    /**
     * source maps activity of asset.
     *
     * @type {SourceMapsActivity}
     * @memberof AssetActivity
     */
    sourcemaps: SourceMapsActivity;

    /**
     * uglify for asset actvity.
     *
     * @type {UglifyActivity}
     * @memberof AssetActivity
     */
    uglify: UglifyActivity;

    /**
     * asset annotation.
     *
     * @type {AnnotationActivity}
     * @memberof AssetActivity
     */
    annotation: AnnotationActivity;

    /**
     * default annottion.
     *
     * @type {AnnotationsConfigure}
     * @memberof AssetActivity
     */
    defaultAnnotation?: AnnotationsConfigure;
}

/**
 * inject asset activity token.
 *
 * @export
 * @class InjectAssetActivityToken
 * @extends {Registration<T>}
 * @template T
 */
export class InjectAssetActivityToken<T extends IAssetActivity> extends Registration<T> {
    constructor(desc: string) {
        super('AssetActivity', desc);
    }
}

/**
 * asset token.
 */
export const AssetToken = new InjectAssetActivityToken<IAssetActivity>('');


/**
 * asset builder token.
 */
export const AssetBuilderToken = new InjectAcitityBuilderToken<IAssetActivity>(AssetToken);
