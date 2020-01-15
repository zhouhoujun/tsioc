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

    async execute(ctx: ActivityContext): Promise<T> {
        let items = await ctx.resolveExpression(this.each);
        items = items.filter(i => !isNullOrUndefined(i));
        if (items && items.length) {
            if (this.parallel) {
                if (ctx.injector.hasRegister(ParallelExecutor)) {
                    return await ctx.injector.getInstance(ParallelExecutor).run(v => {
                        return ctx.getExector().runWorkflow(this.body, v).then(c => c.result);
                    }, items);
                } else {
                    let result: any = await Promise.all(items.map(v => {
                        return ctx.getExector().runWorkflow(this.body, v).then(c => c.result);
                    }));
                    return result as T;
                }
            } else {
                await ctx.getExector().execAction(items.map(v => async (c: WorkflowContext, next) => {
                    await ctx.getExector().runActivity(this.body, v);
                    if (next) {
                        await next();
                    }
                }));
                return ctx.output as T;
            }
        }
        return null;
    }
}
