import { tokenId, TokenId } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { IActivityContext } from '../core/IActivityContext';
import { ControlActivity } from '../core/ControlActivity';
import { ConditionActivity } from './ConditionActivity';
import { ActivityType } from '../core/ActivityMetadata';


export const IFStateKey: TokenId<boolean> = tokenId<boolean>('if-condition');
/**
 * if control activity.
 *
 * @export
 * @class IfActivity
 * @extends {ControlActivity}
 */
@Task('if')
export class IfActivity extends ControlActivity {

    @Input() condition: ConditionActivity;

    @Input({ bindingType: 'dynamic' }) body: ActivityType<any>;

    async execute(ctx: IActivityContext): Promise<void> {
        await this.tryExec(ctx);
    }

    protected async tryExec(ctx: IActivityContext) {
        let result = await this.condition?.execute(ctx);
        ctx.runScope.setValue(IFStateKey, result);
        if (result) {
            await ctx.getExector().runActivity(this.body);
        }
    }
}
