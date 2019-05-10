import { Src, Task, TemplateOption, Expression, ActivityType } from '@tsdi/activities';
import { NodeActivityContext } from '../core';
import { StreamActivity } from './StreamActivity';
import { SourceActivity } from './SourceActivity';
import { DestActivity } from './DestActivity';
import { Input } from '@tsdi/boot';
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
    clean?: Expression<Src>;
    /**
     * shell cmd
     *
     * @type {Expression<Src>}
     * @memberof AssetActivityOption
     */
    src?: Expression<Src>;
    /**
     * shell args.
     *
     * @type {Expression<Src>}
     * @memberof AssetActivityOption
     */
    dist?: Expression<Src>;

    /**
     *
     *
     * @type {ActivityType[]}
     * @memberof ShellActivityOption
     */
    pipes?: ActivityType[];

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

    @Input()
    pipes: StreamActivity

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        await this.startClean(ctx);
        await this.startSource(ctx);
        await this.startPipe(ctx);
        await this.startDest(ctx);
    }

    protected async startClean(ctx: NodeActivityContext): Promise<void> {
        if (this.clean) {
            await this.clean.run(ctx);
        }
    }

    protected async startSource(ctx: NodeActivityContext): Promise<void> {
        if (this.src) {
            await this.src.run(ctx);
        }
    }

    protected async startPipe(ctx: NodeActivityContext): Promise<void> {
        if (this.pipes) {
            await this.pipes.run(ctx);
        }
    }

    protected async startDest(ctx: NodeActivityContext): Promise<void> {
        if (this.dist) {
            await this.dist.run(ctx);
        }
    }
}
