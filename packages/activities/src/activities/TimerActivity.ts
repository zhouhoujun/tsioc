import { Task } from '../decorators';
import { Expression, TimerOption, ActivityContext } from '../core';
import { BodyActivity } from './BodyActivity';


@Task
export abstract class TimerActivity<T extends ActivityContext> extends BodyActivity<T> {

    time: Expression<number>;

    async init(option: TimerOption<T>) {
        if (option.time) {
            this.time = option.time;
            await super.init(option);
        }
    }
}
