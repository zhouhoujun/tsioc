import { Task } from '../decorators';
import { Expression, Activity, TimerConfigure, ActivityContext } from '../core';


@Task('[timer]')
export class TimerActivity extends Activity<number> {

    protected time: Expression<number>;

    onActivityInit(option: TimerConfigure) {
        super.onActivityInit(option);
        this.time = option.time;
    }

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.time, ctx);
    }
}
