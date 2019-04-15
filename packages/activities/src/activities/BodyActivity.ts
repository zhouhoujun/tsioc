import { Task } from '../decorators';
import { ActivityContext, BodyOption } from '../core';
import { ControlActivity } from './ControlActivity';

@Task('body')
export class BodyActivity<T extends ActivityContext> extends ControlActivity<T> {
    async init(option: BodyOption<T>) {
        this.initBody(option.body);
    }
}
