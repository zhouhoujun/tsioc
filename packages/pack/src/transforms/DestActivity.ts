import { NodeActivityContext, ITransform } from '../core';
import { Task, Expression, GActivityType, TemplateOption } from '@tsdi/activities';
import { DestOptions, dest } from 'vinyl-fs';
import { Input, Binding } from '@tsdi/boot';
import { PipeActivity } from './PipeActivity';



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
     * @type {Expression<string>}
     * @memberof DistActivityOption
     */
    dist: Binding<Expression<string>>;

    /**
     * dist stream pipes.
     *
     * @type {GActivityType<ITransform>[]}
     * @memberof DistActivityOption
     */
    destPipes?: Binding<GActivityType<ITransform>[]>

    /**
     * dist option
     *
     * @type {Binding<DestOptions>}
     * @memberof DistActivityOption
     */
    distOptions?: Binding<Expression<DestOptions>>;
}


/**
 * source stream to dist activity.
 *
 * @export
 * @class DestActivity
 * @extends {TransformActivity}
 */
@Task('dist, [dist]')
export class DestActivity extends PipeActivity {

    @Input()
    dist: Expression<string>;

    @Input('destOptions')
    options: Expression<DestOptions>;

    constructor(@Input() dist: Expression<string>) {
        super()
        this.dist = dist;
    }

    protected async execute(ctx: NodeActivityContext): Promise<void> {
        let dist = await this.resolveExpression(this.dist, ctx);
        if (dist) {
            let options = await this.resolveExpression(this.options, ctx);
            await this.executePipe(ctx, this.result.value, dest(ctx.relativeRoot(dist), options), true);
        }
        this.result.value = null;
    }
}
