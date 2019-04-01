import { DependenceConfigure } from '../core';
import { Task } from '../decorators/Task';
import { ControlActivity } from './ControlActivity';

/**
 * dependence activity.
 *
 * @export
 * @class DependenceActivity
 * @extends {ControlActivity}
 */
@Task(ControlActivity, 'dependence')
export class DependenceActivity extends ControlActivity {

    /**
     * execute body.
     *
     * @protected
     * @memberof DependenceActivity
     */
    protected async execute() {
        let config = this.context.config as DependenceConfigure;
        await this.execActivity(config.dependence, this.context);
    }
}
