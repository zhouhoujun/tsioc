import { Task } from '../decorators';
import { Expression, ActivityContext } from '../core';
import { Input } from '@tsdi/components';
import { ControlerActivity } from './ControlerActivity';


@Task('[timer]')
export class TimerActivity extends ControlerActivity<number> {

    @Input('timer') time: Expression<number>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.result.value = await this.resolveExpression(this.time, ctx);
    }
}
