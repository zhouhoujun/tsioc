import { Input, Binding } from '@tsdi/components';
import { Task, TemplateOption } from '@tsdi/activities';
import { TransformActivity } from './TransformActivity';
import { DestOptions, dest } from 'vinyl-fs';
import { NodeExpression, NodeActivityContext } from '../NodeActivityContext';



/**
 * dist activity template option.
 *
 * @export
 * @interface DistActivityOption
 * @extends {TemplateOption}
 */
export interface DistActivityOption extends TemplateOption {
    end: Binding<boolean>;
    /**
     * source stream to dist.
     *
     * @type {NodeExpression<string>}
     * @memberof DistActivityOption
     */
    dist: Binding<string>;

    /**
     * dist option
     *
     * @type {Binding<DestOptions>}
     * @memberof DistActivityOption
     */
    distOptions?: Binding<DestOptions>;
}


/**
 * source stream to dist activity.
 *
 * @export
 * @class DestActivity
 * @extends {TransformActivity}
 */
@Task('dist, [dist]')
export class DestActivity extends TransformActivity<void> {

    @Input() end: boolean;
    @Input() dist: string;

    @Input('destOptions') options: DestOptions;

    async execute(ctx: NodeActivityContext): Promise<void> {
        if (this.dist) {
            let options = this.options;
            let dist = ctx.platform.toRootPath(this.dist);
            await this.pipeStream(ctx, ctx.getData(), options ? dest(dist, options) : dest(dist), this.end !== false);
        }
    }
}
