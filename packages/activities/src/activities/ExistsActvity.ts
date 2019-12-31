import { isNullOrUndefined } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core/ActivityContext';
import { ControlActivity } from '../core/ControlActivity';

@Task('exists')
export class ExistsActvity extends ControlActivity<boolean> {

    @Input() expect: string;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let exp = this.getExector().eval(ctx, this.expect);
        this.result.value = !isNullOrUndefined(exp);
    }
}
