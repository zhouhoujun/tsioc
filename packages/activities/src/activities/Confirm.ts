import { Directive, Input } from '@tsdi/components';


/**
 * while control activity.
 *
 * @export
 * @class ConfirmActivity
 * @extends {ControlActivity}
 */
@Directive('confirm')
export class ConfirmActivity {

    @Input() confirm: ConditionActivity;

    @Input({ bindingType: 'dynamic' }) body: ActivityType<any>;

    async execute(ctx: IActivityContext): Promise<void> {
        let result = await this.condition.execute(ctx);
        if (result) {
            await ctx.getExector().runActivity(this.body);
        }
    }
}
