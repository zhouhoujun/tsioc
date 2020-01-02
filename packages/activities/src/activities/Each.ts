import { isNullOrUndefined } from '@tsdi/ioc';
import { Input, BindingTypes } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { Expression, ActivityType } from '../core/ActivityMetadata';
import { ActivityContext } from '../core/ActivityContext';
import { ControlActivity } from '../core/ControlActivity';
import { ParallelExecutor } from '../core/ParallelExecutor';


@Task('each')
export class EachActicity<T> extends ControlActivity {

    @Input() each: Expression<any[]>;

    @Input({ bindingType: BindingTypes.dynamic }) body: ActivityType<T>;

    @Input() parallel: boolean;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let items = await this.resolveExpression(this.each, ctx);
        items = items.filter(i => !isNullOrUndefined(i));
        if (items && items.length) {
            if (this.parallel) {
                this._enableSetResult = true;
                if (this.getContainer().has(ParallelExecutor)) {
                    this.result = await this.getContainer().getInstance(ParallelExecutor).run(v => {
                        return this.runWorkflow(ctx, this.body, v).then(c => c.result);
                    }, items);
                } else {
                    this.result = await Promise.all(items.map(v => {
                        return this.runWorkflow(ctx, this.body, v).then(c => c.result);
                    }));
                }
            } else {
                this._enableSetResult = false;
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
