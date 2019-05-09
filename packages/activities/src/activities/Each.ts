import { Activity, ActivityContext } from '../core';
import { Task } from '../decorators';
import { Input } from '@tsdi/boot';
import { BodyActivity } from './BodyActivity';
import { PromiseUtil } from '@tsdi/ioc';


@Task('each')
export class EachActicity<T> extends Activity<T> {

    @Input()
    each: any[];

    @Input()
    body: BodyActivity<T>;

    async execute(ctx: ActivityContext): Promise<void> {
        if (this.each && this.each.length) {
            await PromiseUtil.step(this.each.map(v => async () => {
                ctx.data = v;
                await this.body.run(ctx);
            }));
        }
    }
}
