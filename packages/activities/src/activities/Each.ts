import { ActivityContext, Expression } from '../core';
import { Task } from '../decorators';
import { Input } from '@tsdi/boot';
import { BodyActivity } from './BodyActivity';
import { ControlerActivity } from './ControlerActivity';


@Task('each')
export class EachActicity<T> extends ControlerActivity<T> {

    @Input()
    each: Expression<any[]>;

    @Input()
    body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let items = await this.resolveExpression(this.each, ctx);
        if (items && items.length) {
            await this.execActions(ctx, items.map(v => async (c: ActivityContext , next) => {
                await ctx.setBody(v, true);
                await this.body.run(c, next);
            }));
        }
    }
}
