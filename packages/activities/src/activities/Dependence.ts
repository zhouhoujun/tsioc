import { ActivityContext } from '../core';
import { Task } from '../decorators/Task';
import { ControlActivity } from './ControlActivity';

/**
 * dependence activity.
 *
 * @export
 * @class DependenceActivity
 * @extends {ControlActivity}
 */
@Task({
    selector: 'dependence'
})
export class DependenceActivity<T extends ActivityContext> extends ControlActivity<T> {

    /**
     * execute body.
     *
     * @protected
     * @memberof DependenceActivity
     */
    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let config = this.context.config as DependenceConfigure;
        await this.execActions(ctx, config.dependence);
        await super.execute(ctx, next);
    }
}
