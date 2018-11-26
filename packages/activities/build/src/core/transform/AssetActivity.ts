import { isArray } from '@ts-ioc/core';
import { UglifyActivity, TestActivity, WatchActivity } from '../activities';
import { AnnotationActivity, AnnotationsConfigure } from './Annotation';
import { IAssetActivity, AssetToken } from './IAssetActivity';
import { Asset } from '../decorators';
import { TransformActivity } from './TransformActivity';
import { SourceActivity } from './SourceActivity';
import { DestActivity } from './DestActivity';
import { SourceMapsActivity } from './SourceMapsActivity';



/**
 * Asset Activity
 *
 * @export
 * @class AssetActivity
 * @extends {TaskElement}
 * @implements {IAssetActivity}
 */
@Asset(AssetToken)
export class AssetActivity extends TransformActivity implements IAssetActivity {
    /**
     * src activity.
     *
     * @type {SourceActivity}
     * @memberof AssetActivity
     */
    src: SourceActivity;

    /**
     * test activity.
     *
     * @type {TestActivity}
     * @memberof AssetActivity
     */
    test: TestActivity;

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

    /**
     * before pipe
     *
     * @protected
     * @returns {Promise<void>}
     * @memberof AssetActivity
     */
    protected async beforePipe(): Promise<void> {
        let ctx = this.getContext();
        if (this.test) {
            await this.test.run(ctx);
        }
        if (!(this.watch && ctx.target === this.watch)) {
            console.log('asset src:', this.src);
            if (this.src) {
                await this.src.run(ctx);
            }
            if (this.watch) {
                this.watch.body = this;
                let watchCtx = this.getCtxFactory().create();
                watchCtx.target = this.watch;
                this.watch.run(watchCtx);
            }
        }
        if (this.annotation) {
            await this.annotation.run(ctx);
        }
        if (this.sourcemaps) {
            ctx.sourceMaps = this.sourcemaps;
            await this.sourcemaps.init(ctx);
        }
    }

    /**
     * after pipe.
     *
     * @protected
     * @returns {Promise<ITransform>}
     * @memberof AssetActivity
     */
    protected async afterPipe(): Promise<void> {
        await this.executeUglify();
        if (isArray(this.dest)) {
            if (this.dest.length > 0) {
                await Promise.all(this.dest.map(ds => {
                    return this.executeDest(ds);
                }));
            }
        } else if (this.dest) {
            await this.executeDest(this.dest);
        }
    }

    /**
     * execute uglify.
     *
     * @protected
     * @param {TransformActivityContext} ctx
     * @returns
     * @memberof AssetActivity
     */
    protected async executeUglify() {
        if (this.uglify) {
            await this.uglify.run(this.getContext());
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
    protected async executeDest(ds: DestActivity) {
        if (!ds) {
            return;
        }
        await ds.run(this.getContext());
    }
}
