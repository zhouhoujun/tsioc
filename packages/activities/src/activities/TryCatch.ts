import { lang, Type } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { IActivityContext } from '../core/IActivityContext';
import { ControlActivity } from '../core/ControlActivity';
import { ActivityType } from '../core/ActivityMetadata';


@Task('catch')
export class CatchActivity extends ControlActivity {

    @Input() error: Type<Error>;

    @Input({ bindingType: 'dynamic' }) body: ActivityType<any>;

    async execute(ctx: IActivityContext): Promise<void> {
        let err = ctx.getData();
        if (this.error && err && lang.getClass(err) === this.error) {
            ctx.getExector().runActivity(this.body);
        } else if (!this.error) {
            ctx.getExector().runActivity(this.body);
        }
    }
}

/**
 * while control activity.
 *
 * @export
 * @class TryCatchActivity
 * @extends {ControlActivity}
 */
@Task('try')
export class TryCatchActivity extends ControlActivity {

    @Input({ bindingType: 'dynamic' }) try: ActivityType<any>;

    @Input('catchs', CatchActivity)
    catchs: CatchActivity[];

    @Input({ bindingType: 'dynamic' }) finallies: ActivityType<any>;

    async execute(ctx: IActivityContext): Promise<void> {
        try {
            await ctx.getExector().runActivity(this.try);
        } catch (err) {
            if (this.catchs) {
                await ctx.getExector().runActivity(this.catchs, err);
            }
        } finally {
            if (this.finallies) {
                await ctx.getExector().runActivity(this.finallies);
            }
        }
    }
}
