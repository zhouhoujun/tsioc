import { Src, Task, TemplateOption, Expression, ActivityType, Activity, Input } from '@tsdi/activities';
import { NodeActivityContext, ITransform } from '../core';
import { StreamActivity } from './StreamActivity';
import { SourceActivity } from './SourceActivity';
import { DestActivity } from './DestActivity';


/**
 * shell activity config.
 *
 * @export
 * @interface ShellActivityConfig
 * @extends {ActivityConfigure}
 */
export interface ShellActivityOption extends TemplateOption {
    /**
     * shell cmd
     *
     * @type {Expression<Src>}
     * @memberof ShellActivityConfig
     */
    src?: Expression<Src>;
    /**
     * shell args.
     *
     * @type {Expression<Src>}
     * @memberof ShellActivityConfig
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
export class AssetActivity extends Activity<ITransform> {
    /**
     * assert src.
     *
     * @type {Expression<Src>}
     * @memberof ShellActivityConfig
     */
    @Input()
    src: SourceActivity;
    /**
     * shell args.
     *
     * @type {Expression<Src>}
     * @memberof ShellActivityConfig
     */
    @Input()
    dist: DestActivity;

    @Input()
    pipes: StreamActivity

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        if (this.src) {
            await this.src.run(ctx);
        }
        if (this.pipes) {
            await this.pipes.run(ctx);
        }
        if (this.dist) {
            await this.dist.run(ctx);
        }
    }
}
