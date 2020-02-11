import { Input, Binding } from '@tsdi/components';
import { Task, TemplateOption } from '@tsdi/activities';
import { TransformActivity, TransformService } from './TransformActivity';
import { DestOptions, dest } from 'vinyl-fs';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';
import { ITransform } from '../ITransform';


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

    async execute(ctx: NodeActivityContext): Promise<ITransform> {
        let dist = await ctx.resolveExpression(this.dist);
        if (dist) {
            let options = await ctx.resolveExpression(this.options);
            return await ctx.injector.get(TransformService).executePipe(ctx, ctx.output, dest(ctx.platform.toRootPath(dist), options), true);
        }
    }
}
