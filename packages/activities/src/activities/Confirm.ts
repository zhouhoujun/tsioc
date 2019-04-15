import { Task } from '../decorators/Task';
import { ActivityContext, ConfirmActivityOption } from '../core';
import { ConditionActivity } from './ConditionActivity';


/**
 * while control activity.
 *
 * @export
 * @class ConfirmActivity
 * @extends {ControlActivity}
 */
@Task('confirm')
export class ConfirmActivity<T extends ActivityContext> extends ConditionActivity<T> {
    async init(option: ConfirmActivityOption<T>) {
        this.initCondition(option.confirm);
    }

    protected async whenFalse(ctx: T, next?: () => Promise<void>) {

    }
}
