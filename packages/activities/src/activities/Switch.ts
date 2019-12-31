import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { BodyActivity } from './BodyActivity';
import { Expression } from '../core/ActivityMetadata';
import { ActivityContext } from '../core/ActivityContext';
import { ControlActivity } from '../core/ControlActivity';


@Task('case')
export class CaseActivity<T> extends ControlActivity<T> {

    @Input() caseKey: any;

    @Input() body: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        this.body.run(ctx);
    }
}

/**
 * Switch control activity.
 *
 * @export
 * @class SwitchActivity
 * @extends {ControlActivity}
 */
@Task('switch')
export class SwitchActivity<T> extends ControlActivity<T> {

    isScope = true;

    @Input() switch: Expression;

    @Input(CaseActivity) cases: CaseActivity<T>[];

    @Input() defaults: BodyActivity<T>;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let matchkey = await this.resolveExpression(this.switch, ctx);

        let activity = this.cases.find(c => c.caseKey === matchkey);

        if (activity) {
            await activity.run(ctx);
        } else if (this.defaults) {
            await this.defaults.run(ctx);
        }
    }
}
