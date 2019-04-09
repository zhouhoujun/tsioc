import { Activity, ActivityContext } from '../core';
import { Task } from '../decorators';



@Task('condition')
export class ConditionActivity<T extends ActivityContext> extends Activity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        ctx.condition = await this.resolveSelector<boolean>(ctx);
        next();
    }
}
