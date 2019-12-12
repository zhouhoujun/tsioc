import { isNullOrUndefined } from '@tsdi/ioc';
import { Input, BindingTypes } from '@tsdi/components';
import { Task } from '../decorators';
import { ActivityContext, Expression, ParallelExecutor, ActivityType, ControlActivity } from '../core';


@Task('each')
export class EachActicity<T> extends ControlActivity<T> {

    @Input() each: Expression<any[]>;

    @Input({ bindingType: BindingTypes.dynamic }) body: ActivityType<T>;

    @Input() parallel: boolean;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let items = await this.resolveExpression(this.each, ctx);
        items = items.filter(i => !isNullOrUndefined(i));
        if (items && items.length) {
            if (this.parallel) {
                if (this.getContainer().has(ParallelExecutor)) {
                    await this.getContainer().getInstance(ParallelExecutor).run(v => {
                        ctx.clone().setBody(v);
                        return this.runWorkflow(ctx, this.body);
                    }, items);
                } else {
                    await Promise.all(items.map(v => {
                        ctx.clone().setBody(v);
                        return this.runWorkflow(ctx, this.body);
                    }));
                }
            } else {
                let actions = await this.getExector().parseActions(this.body);
                await this.getExector().execActions(ctx, items.map(v => async (c: ActivityContext, next) => {
                    ctx.setBody(v);
                    await this.getExector().execActions(c, actions);
                    await next();
                }));
            }
        }
    }
}
