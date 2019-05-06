import { NodeActivityContext, ITransform } from '../core';
import { Task, Expression, Input, GActivityType, TemplateOption } from '@tsdi/activities';
import { Inject } from '@tsdi/ioc';
import { DestOptions, dest } from 'vinyl-fs';
import { StreamActivity } from './StreamActivity';



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
    dist: Expression<string>;

    /**
     * dist stream pipes.
     *
     * @type {GActivityType<ITransform>[]}
     * @memberof DistActivityOption
     */
    destPipes?: GActivityType<ITransform>[]

    /**
     * dist option
     *
     * @type {Expression<DestOptions>}
     * @memberof DistActivityOption
     */
    distOptions?: Expression<DestOptions>;
}


/**
 * source stream to dist activity.
 *
 * @export
 * @class DestActivity
 * @extends {TransformActivity}
 */
@Task('dist, [dist]')
export class DestActivity extends StreamActivity {

    @Input()
    dist: Expression<string>;

    @Input('destOptions')
    options: Expression<DestOptions>;

    @Input('destPipes')
    pipes: GActivityType<ITransform>[];

    constructor(@Inject('[dist]') dist: Expression<string>) {
        super([])
        this.dist = dist;
    }

    protected async execute(ctx: NodeActivityContext): Promise<void> {

        let dist = await this.resolveExpression(this.dist, ctx);
        if (dist) {
            await super.execute(ctx);
            let options = await this.resolveExpression(this.options, ctx);
            await this.executePipe(ctx, this.result.value, (ctx: NodeActivityContext) => dest(ctx.relativeRoot(dist), options) as any, true)
        }
    }
}
