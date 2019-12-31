import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { ActivityContext } from '../core/ActivityContext';
import { ControlActivity } from '../core/ControlActivity';

@Task('equals')
export class EqualsActivity extends ControlActivity<boolean> {

    @Input() expect: string;

    @Input() value: any;

    protected async execute(ctx: ActivityContext): Promise<void> {
        let exp = this.getExector().eval(ctx, this.expect);
        this.result.value = exp === this.value;
    }
}
