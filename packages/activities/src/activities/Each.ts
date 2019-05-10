import { Activity, ActivityContext } from '../core';
import { Task } from '../decorators';
import { Input } from '@tsdi/boot';
import { BodyActivity } from './BodyActivity';


@Task('each')
export class EachActicity<T> extends Activity<T> {

    @Input()
    each: any[];

    @Input()
    body: BodyActivity<T>;

    async execute(ctx: ActivityContext): Promise<void> {
        if (this.each && this.each.length) {
            await this.execActions(ctx, this.each.map(v => async (c: ActivityContext , next) => {
                await this.setBody(c, v);
                await this.body.run(c, next);
            }));
        }
    }
}
