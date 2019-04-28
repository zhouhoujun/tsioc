import { NodeActivityContext, ITransform } from '../core';
import { Task, Expression, Input, GActivityType } from '@tsdi/activities';
import { Inject } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';
import { DestOptions, dest } from 'vinyl-fs';
import { StreamActivity } from './StreamActivity';

/**
 * Source activity.
 *
 * @export
 * @class DestActivity
 * @extends {TransformActivity}
 */
@Task('dist, [dist]')
export class DestActivity extends StreamActivity {

    @Input()
    dist: Expression<string>;

    @Input()
    options: Expression<DestOptions>;

    @Input()
    pipes: GActivityType<ITransform>[]

    constructor(
        @Inject('[dist]') dist: Expression<string>,
        @Inject(ContainerToken) container: IContainer) {
        super([], container)
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
