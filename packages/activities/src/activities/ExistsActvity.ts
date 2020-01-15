import { isNullOrUndefined } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core/ActivityContext';
import { ControlActivity } from '../core/ControlActivity';

@Task('exists')
export class ExistsActvity extends ControlActivity<boolean> {

    @Input() expect: string;

    async execute(ctx: ActivityContext): Promise<boolean> {
        let exp = ctx.getExector().eval(this.expect);
        return !isNullOrUndefined(exp);
    }
}
