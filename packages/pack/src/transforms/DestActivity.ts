import { Input, Binding } from '@tsdi/components';
import { Task, ActivityType, TemplateOption } from '@tsdi/activities';
import { NodeActivityContext, ITransform, NodeExpression } from '../core';
import { TransformActivity, TransformService } from './TransformActivity';
import { DestOptions, dest } from 'vinyl-fs';


/**
 * dist activity template option.
 *
 * @export
 * @interface DistActivityOption
 * @extends {TemplateOption}
 */
export interface DistActivityOption extends TemplateOption {
    /**
     * source stream to dist.
     *
     * @type {NodeExpression<string>}
     * @memberof DistActivityOption
     */
    dist: Binding<NodeExpression<string>>;

    /**
     * dist stream pipes.
     *
     * @type {GActivityType<ITransform>[]}
     * @memberof DistActivityOption
     */
    destPipes?: Binding<ActivityType<ITransform>[]>

    /**
     * dist option
     *
     * @type {Binding<DestOptions>}
     * @memberof DistActivityOption
     */
    distOptions?: Binding<NodeExpression<DestOptions>>;
}


/**
 * source stream to dist activity.
 *
 * @export
 * @class DestActivity
 * @extends {TransformActivity}
 */
@Task('dist, [dist]')
export class DestActivity extends TransformActivity {

    @Input() dist: NodeExpression<string>;

    @Input('destOptions') options: NodeExpression<DestOptions>;

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let dist = await this.resolveExpression(this.dist, ctx);
        if (dist) {
            let options = await this.resolveExpression(this.options, ctx);
            await ctx.injector.get(TransformService).executePipe(ctx, this.result, dest(ctx.platform.toRootPath(dist), options), true);
        }
        this.result = null;
    }
}
