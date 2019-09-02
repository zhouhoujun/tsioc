import { ActivityContext, Expression, ParallelExecutor, ActivityType } from '../core';
import { Task } from '../decorators';
import { Input, BindingTypes } from '@tsdi/components';
import { ControlerActivity } from './ControlerActivity';
import { isNullOrUndefined } from '@tsdi/ioc';


@Task('each')
export class EachActicity<T> extends ControlerActivity<T> {

    @Input() each: Expression<any[]>;

    @Input({ bindingType: BindingTypes.dynamic }) body: ActivityType<T>;

    @Input() parallel: boolean;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let items = await this.resolveExpression(this.each, ctx);
        items = items.filter(i => !isNullOrUndefined(i));
        if (items && items.length) {
            if (this.parallel) {
                if (this.getContainer().has(ParallelExecutor)) {
                    await this.getContainer().get(ParallelExecutor).run(v => {
                        ctx.setBody(v, true);
                        return this.runWorkflow(ctx, this.body);
                    }, items);
                } else {
                    await Promise.all(items.map(v => {
                        ctx.setBody(v, true);
                        return this.runWorkflow(ctx, this.body);
                    }));
                }
            } else {
                let actions = await this.getExector().parseActions(this.body);
                await this.getExector().execActions(ctx, items.map(v => async (c: ActivityContext, next) => {
                    await c.setBody(v, true);
                    await this.getExector().execActions(c, actions);
                    await next();
                }));
            }
        }
    }
}
