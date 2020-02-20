import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { IActivityContext } from '../core/IActivityContext';
import { ControlActivity } from '../core/ControlActivity';

@Task('equals')
export class EqualsActivity extends ControlActivity<boolean> {

    @Input() expect: string;

    @Input() value: any;

    async execute(ctx: IActivityContext): Promise<boolean> {
        let exp = ctx.getExector().eval(this.expect);
        return exp === this.value;
    }
}
