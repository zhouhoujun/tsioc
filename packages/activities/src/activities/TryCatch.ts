import { Task } from '../decorators/Task';
import { ActivityContext, Activity } from '../core';
import { BodyActivity } from './BodyActivity';
import { Input } from '../decorators';
import { lang, Type } from '@tsdi/ioc';

@Task('catch')
export class CatchActivity<T extends Error> extends Activity<T> {

    @Input()
    error: Type<Error>;

    @Input()
    body: BodyActivity<any>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let runScope = ctx.runnable.status.currentScope;
        if (this.error && runScope && runScope.scope
            && runScope.scope.result.error
            && lang.getClass(runScope.scope.result.error) === this.error) {
            this.body.run(ctx);
        } else if (!this.error) {
            this.body.run(ctx);
        }
    }

}

/**
 * while control activity.
 *
 * @export
 * @class TryCatchActivity
 * @extends {ControlActivity}
 */
@Task('try')
export class TryCatchActivity<T> extends Activity<T> {
    isScope = true;
    @Input()
    try: BodyActivity<T>;

    @Input()
    catchs: CatchActivity<Error>[];

    @Input()
    finallies: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        try {
            await this.try.run(ctx);
        } catch (err) {
            this.result.error = err;
            if (this.catchs) {
                await this.execActivity(ctx, this.catchs);
            }
        } finally {
            if (this.finallies) {
                await this.finallies.run(ctx);
                this.result.value = this.finallies.result.value;
            }
        }
    }
}
