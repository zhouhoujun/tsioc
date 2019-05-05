import { Task } from '../decorators';
import { Expression, Activity, ActivityContext } from '../core';
import { Inject } from '@tsdi/ioc';


@Task('[timer]')
export class TimerActivity extends Activity<number> {

    constructor(@Inject('[timer]') protected time: Expression<number>) {
        super()
    }

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.time, ctx);
    }
}
