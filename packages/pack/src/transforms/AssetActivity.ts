import { Src, Task, TemplateOption, Expression, ActivityType } from '@tsdi/activities';
import { NodeActivityContext, ITransform } from '../core';
import { StreamActivity } from './StreamActivity';
import { SourceActivity } from './SourceActivity';
import { DestActivity } from './DestActivity';
import { Input, Binding } from '@tsdi/boot';
import { CleanActivity } from '../tasks';
import { PipeActivity } from './PipeActivity';

import { SourcemapInitActivity, SourcemapWriteActivity } from './SourceMap';

/**
 * shell activity config.
 *
 * @export
 * @interface AssetActivityOption
 * @extends {ActivityConfigure}
 */
export interface AssetActivityOption extends TemplateOption {
    clean?: Binding<Expression<Src>>;
    /**
     * shell cmd
     *
     * @type {Binding<Src>}
     * @memberof AssetActivityOption
     */
    src?: Binding<Expression<Src>>;

    sourcemap?: Binding<Expression<string | boolean>>;
    /**
     * shell args.
     *
     * @type {Binding<Src>}
     * @memberof AssetActivityOption
     */
    dist?: Binding<Expression<Src>>;

    /**
     *
     *
     * @type {Binding<Expression<ITransform>[]>}
     * @memberof ShellActivityOption
     */
    pipes?: Binding<Expression<ITransform>[]>;

}


/**
 * Shell Task
 *
 * @class ShellActivity
 * @implements {ITask}
 */
@Task('asset')
export class AssetActivity extends PipeActivity {

    @Input()
    clean: CleanActivity;
    /**
     * assert src.
     *
     * @type {Expression<Src>}
     * @memberof AssetActivity
     */
    @Input()
    src: SourceActivity;
    /**
     * shell args.
     *
     * @type {Expression<Src>}
     * @memberof AssetActivity
     */
    @Input('dist', './dist')
    dist: DestActivity;

    @Input('sourcemap')
    sourcemapInit: SourcemapInitActivity;

    @Input('sourcemap')
    sourcemapWrite: SourcemapWriteActivity;

    @Input('pipes')
    streamPipes: StreamActivity;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        await this.runActivity(ctx, this.getRunSequence());
    }

    protected getRunSequence(): ActivityType[] {
        return [
            this.clean,
            this.src,
            this.sourcemapInit,
            this.streamPipes,
            this.sourcemapWrite,
            this.dist
        ]
    }

}
