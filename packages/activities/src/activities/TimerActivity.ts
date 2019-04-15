import { Task } from '../decorators';
import { Expression, TimerOption, ActivityContext } from '../core';
import { isArray } from '@tsdi/ioc';
import { ControlActivity } from './ControlActivity';


@Task
export class TimerActivity<T extends ActivityContext> extends ControlActivity<T> {
    protected time: Expression<number>;

    protected initTimerOption(option: TimerOption<T>) {
        if (option.time && option.body) {
            this.time = option.time;
            this.add(...isArray(option.body) ? option.body : [option.body]);
        }
    }
}
