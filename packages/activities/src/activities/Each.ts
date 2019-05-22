import { ActivityContext, Expression, ActivityType } from '../core';
import { Task } from '../decorators';
import { Input, BindingTypes } from '@tsdi/boot';
import { ControlerActivity } from './ControlerActivity';
import { isNullOrUndefined } from '@tsdi/ioc';


@Task('each')
export class EachActicity<T> extends ControlerActivity<T> {

    @Input()
    each: Expression<any[]>;

    @Input({
        bindingType: BindingTypes.dynamic
    })
    body: ActivityType | ActivityType[];

    protected async execute(ctx: ActivityContext): Promise<void> {
        let items = await this.resolveExpression(this.each, ctx);
        items = items.filter(i => !isNullOrUndefined(i));
        if (items && items.length) {
            await this.getExector().execActions(ctx, items.map(v => async (c: ActivityContext, next) => {
                await ctx.setBody(v, true);
                await this.runActivity(ctx, this.body);
                await next();
            }));
        }
    }
}
