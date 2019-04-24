import { Src, Task, TemplateOption, Expression, ActivityType, BodyActivity } from '@tsdi/activities';
import { NodeActivityContext } from '../core';


/**
 * shell activity config.
 *
 * @export
 * @interface ShellActivityConfig
 * @extends {ActivityConfigure}
 */
export interface ShellActivityOption<T extends NodeActivityContext> extends TemplateOption<T> {
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

    pipes?: ActivityType<T>[];

}


/**
 * Shell Task
 *
 * @class ShellActivity
 * @implements {ITask}
 */
@Task('asset')
export class AssetActivity<T extends NodeActivityContext> extends BodyActivity<T> {
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

    async init(option: ShellActivityOption<T>) {
        await super.init(option);
        this.src = option.src;
        this.dist = option.dist;
        this.body = option.pipes;
    }

    async run(ctx: T, next?: () => Promise<void>): Promise<void> {
        this.currSrc = await this.resolveExpression(this.src, ctx);
        this.currDist = await this.resolveExpression(this.dist, ctx);
        await super.run(ctx, next);

    }
}
