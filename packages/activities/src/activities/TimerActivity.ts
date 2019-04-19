import { Task } from '../decorators';
import { Expression, TimerTemplate, ActivityContext } from '../core';
import { BodyActivity } from './BodyActivity';


@Task
export abstract class TimerActivity<T extends ActivityContext> extends BodyActivity<T> {

    time: Expression<number>;

    async init(option: TimerTemplate<T>) {
        if (option.time) {
            this.time = option.time;
        }
        await super.init(option);
    }
}
