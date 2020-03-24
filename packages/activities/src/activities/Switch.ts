import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { Expression, ActivityType } from '../core/ActivityMetadata';
import { IActivityContext } from '../core/IActivityContext';
import { ControlActivity } from '../core/ControlActivity';


@Task('case')
export class CaseActivity extends ControlActivity {

    @Input() caseKey: any;

    @Input({ bindingType: 'dynamic' }) body: ActivityType<any>;

    async execute(ctx: IActivityContext): Promise<void> {
        await ctx.getExector().runActivity(this.body);
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
export class SwitchActivity extends ControlActivity {

    @Input() switch: Expression;

    @Input(CaseActivity) cases: CaseActivity[];

    @Input({ bindingType: 'dynamic' }) defaults: ActivityType<any>;

    async execute(ctx: IActivityContext): Promise<void> {
        let matchkey = await ctx.resolveExpression(this.switch);

        let activity = this.cases.find(c => c.caseKey === matchkey);

        if (activity) {
            await activity.execute(ctx);
        } else if (this.defaults) {
            await ctx.getExector().runActivity(this.defaults);
        }
    }
}
