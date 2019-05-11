import { Activity, ActivityContext, Expression } from '../core';
import { Task } from '../decorators';
import { Input } from '@tsdi/boot';
import { BodyActivity } from './BodyActivity';


@Task('each')
export class EachActicity<T> extends Activity<T> {

    @Input()
    each: Expression<any[]>;

    @Input()
    body: BodyActivity<T>;

    async execute(ctx: ActivityContext): Promise<void> {
        let items = await this.resolveExpression(this.each, ctx);
        if (items && items.length) {
            await this.execActions(ctx, items.map(v => async (c: ActivityContext , next) => {
                await this.setBody(c, v);
                await this.body.run(c, next);
            }));
        }
    }
}
