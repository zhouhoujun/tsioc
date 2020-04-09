import { Input } from '@tsdi/components';
import { Task } from '../decorators/Task';
import { IActivityContext } from '../core/IActivityContext';
import { ControlActivity } from '../core/ControlActivity';

@Task('equals')
export class EqualsActivity extends ControlActivity<boolean> {

    @Input() equals: string;

    @Input() value: any;

    async execute(ctx: IActivityContext): Promise<boolean> {
        let exp = ctx.getExector().eval(this.equals);
        return exp === this.value;
    }
}
