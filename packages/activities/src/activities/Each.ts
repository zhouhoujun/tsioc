import { ActivityContext, Expression } from '../core';
import { Task } from '../decorators';
import { Input } from '@tsdi/components';
import { ControlerActivity } from './ControlerActivity';
import { isNullOrUndefined } from '@tsdi/ioc';
import { BodyActivity } from './BodyActivity';


@Task('each')
export class EachActicity<T> extends ControlerActivity<T> {

    @Input() each: Expression<any[]>;

    @Input() body: BodyActivity<T>;

    @Input() parallel: boolean;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let items = await this.resolveExpression(this.each, ctx);
        items = items.filter(i => !isNullOrUndefined(i));
        if (items && items.length) {
            await this.getExector().execActions(ctx, items.map(v => async (c: ActivityContext, next) => {
                await c.setBody(v, true);
                await this.body.run(c);
                await next();
            }));
        }
    }
}
