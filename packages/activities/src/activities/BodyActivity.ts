import { Task } from '../decorators';
import { ActivityType, CompoiseActivity } from '../core';
import { Inject } from '@tsdi/ioc';
import { IContainer, ContainerToken } from '@tsdi/core';

/**
 * body activity.
 *
 * @export
 * @class BodyActivity
 * @extends {ControlActivity<T>}
 * @template T
 */
@Task('[body]')
export class BodyActivity<T> extends CompoiseActivity<T> {

    constructor(
        @Inject('[body]') activities: ActivityType[],
        @Inject(ContainerToken) container: IContainer) {
        super(container)
        this.activities = activities || [];
    }
}
