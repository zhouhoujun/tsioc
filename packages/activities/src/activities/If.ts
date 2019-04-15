import { Task } from '../decorators/Task';
import { ActivityContext, IfActivityOption } from '../core';
import { ConditionActivity } from './ConditionActivity';

/**
 * if control activity.
 *
 * @export
 * @class IfActivity
 * @extends {ControlActivity}
 */
@Task('if')
export class IfActivity<T extends ActivityContext> extends ConditionActivity<T> {

    /**
     * init activity.
     *
     * @param {IfActivityOption<T>} option
     * @memberof Activity
     */
    async init(option: IfActivityOption<T>) {
        this.initCondition(option.if);
        this.initBody(option.elseif);
        this.initBody(option.else);
    }

    protected async whenFalse(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (next) {
            await next();
        }
    }
}
