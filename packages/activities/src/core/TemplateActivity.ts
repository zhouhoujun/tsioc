import { CompoiseActivity } from './CompoiseActivity';
import { ActivityContext, ActivityOption } from './ActivityContext';
import { SelectorManager } from './SelectorManager';
import { InjectToken, Inject } from '@tsdi/ioc';
import { Task } from '../decorators';


export const TemplateToken = new InjectToken<ActivityOption>('template_option');


@Task
export class TemplateActivity<T extends ActivityContext> extends CompoiseActivity<T> {

    @Inject(TemplateToken)
    protected template: ActivityOption;

    async execute(ctx: T, next?: () => Promise<void>): Promise<void> {
        if (!this.template) {
            this.template = await this.resolveSelector<ActivityOption>(ctx);
        }
        this.activities = [];
        this.container.get(SelectorManager).forEach((fac, key) => {
            if (this.template[key]) {
                this.use(fac({ provide: TemplateToken, useValue: this.template[key] }));
            }
        })
        super.execute(ctx, next);
    }
}
