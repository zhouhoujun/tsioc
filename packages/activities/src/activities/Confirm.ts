import { Task } from '../decorators/Task';
import { ActivityContext, CompoiseActivity } from '../core';
import { ControlActivity } from './ControlActivity';


/**
 * while control activity.
 *
 * @export
 * @class ConfirmActivity
 * @extends {ControlActivity}
 */
@Task({
    selector: 'confirm'
})
export class ConfirmActivity<T extends ActivityContext> extends ControlActivity<T> {

    body: CompoiseActivity<T>;

    async execute(ctx: T, next: () => Promise<void>): Promise<void>{
        let config = ctx.config as ConfirmConfigure;
        let confirm = this.resolveExpression(config.confirm);
        if (confirm) {
            await this.execActivity(ctx, next);
        }
    }
}
