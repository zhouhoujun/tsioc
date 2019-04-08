import { Task } from '../decorators/Task';
import { ActivityContext, Expression } from '../core';
import { ControlActivity } from './ControlActivity';


export interface ConfirmConfigure {
    confirm: Expression<boolean>;
}

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

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let confirm = await this.resolveSelector<boolean>(ctx);
        if (confirm) {
            await super.execute(ctx, next);
        }
    }
}
