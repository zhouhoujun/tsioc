import { isNullOrUndefined } from '@tsdi/ioc';
import { Input, BindingTypes } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { Expression, ActivityType } from '../core/ActivityMetadata';
import { ActivityContext } from '../core/ActivityContext';
import { ControlActivity } from '../core/ControlActivity';
import { ParallelExecutor } from '../core/ParallelExecutor';
import { WorkflowContext } from '../core/WorkflowInstance';


@Task('each')
export class EachActicity<T> extends ControlActivity<T> {

    @Input() each: Expression<any[]>;

    @Input({ bindingType: BindingTypes.dynamic }) body: ActivityType<T>;

    @Input() parallel: boolean;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let items = await ctx.resolveExpression(this.each);
        items = items.filter(i => !isNullOrUndefined(i));
        if (items && items.length) {
            if (this.parallel) {
                if (ctx.injector.hasRegister(ParallelExecutor)) {
                    await ctx.injector.getInstance(ParallelExecutor).run(v => {
                        return ctx.getExector().runWorkflow(this.body, v).then(c => c);
                    }, items);
                } else {
                    await Promise.all(items.map(v => {
                        return ctx.getExector().runWorkflow(this.body, v).then(c => c.status.currentScope.context.output);
                    }));
                }
            } else {
                let actions = await ctx.getExector().parseActions(this.body);
                await ctx.getExector().execActions(items.map(v => async (c: WorkflowContext, next) => {
                    await ctx.getExector().execActions(actions);
                    await next();
                }));
            }
        }
    }
}
