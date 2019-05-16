import { Src, Task, TemplateOption, Expression, ActivityType } from '@tsdi/activities';
import { NodeActivityContext } from '../core';
import { StreamActivity } from './StreamActivity';
import { SourceActivity } from './SourceActivity';
import { DestActivity } from './DestActivity';
import { Input, Binding, AfterInit } from '@tsdi/boot';
import { CleanActivity } from '../tasks';
import { PipeActivity } from './PipeActivity';


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
     * @type {ActivityType[]}
     * @memberof ShellActivityOption
     */
    pipes?: Binding<ActivityType[]>;

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

    @Input('pipes')
    streamPipes: StreamActivity;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        await this.runActivity(ctx, this.getRunSequence());
    }

    protected getRunSequence(): ActivityType[] {
        return [
            this.clean,
            this.src,
            this.streamPipes,
            this.dist
        ]
    }

}
