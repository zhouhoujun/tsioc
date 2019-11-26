import { Input } from '@tsdi/components';
import { Task } from '../decorators';
import { Expression, ActivityContext, ControlActivity } from '../core';



@Task('[timer]')
export class TimerActivity extends ControlActivity<number> {

    @Input('timer') time: Expression<number>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.time, ctx);
    }
}
