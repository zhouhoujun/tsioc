import { Task, Input } from '../decorators';
import { Expression, Activity, ActivityContext } from '../core';


@Task('[timer]')
export class TimerActivity extends Activity<number> {

    @Input()
    protected time: Expression<number>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.time, ctx);
    }
}
