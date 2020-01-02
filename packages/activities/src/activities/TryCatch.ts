import { lang, Type } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core/ActivityContext';
import { Activity } from '../core/Activity';
import { ControlActivity } from '../core/ControlActivity';
import { BodyActivity } from './BodyActivity';


@Task('catch')
export class CatchActivity<T = any> extends ControlActivity<T> {

    @Input() error: Type<Error>;

    @Input() body: BodyActivity;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let runScope = ctx.status.currentScope;
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

    @Input()
    try: BodyActivity<T>;

    @Input('catchs', CatchActivity)
    catchs: CatchActivity<T>[];

    @Input()
    finallies: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        try {
            await this.try.run(ctx);
        } catch (err) {
            this.result = err;
            if (this.catchs) {
                await this.runActivity(ctx, this.catchs);
            }
        } finally {
            if (this.finallies) {
                await this.finallies.run(ctx);
                this.result = this.finallies.result;
            }
        }
    }
}
