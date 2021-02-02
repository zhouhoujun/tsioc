import { Input } from '@tsdi/components';
import { Task } from '../decor';
import { Expression } from '../core/ActivityMetadata';
import { IActivityContext } from '../core/IActivityContext';
import { ControlActivity } from '../core/ControlActivity';



@Task('[timer]')
export class TimerActivity extends ControlActivity<number> {

    @Input('timer') time: Expression<number>;

    async execute(ctx: IActivityContext): Promise<number> {
        return await ctx.getExector().resolveExpression(this.time);
    }
}
