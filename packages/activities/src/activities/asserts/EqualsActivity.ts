import { Input } from '@tsdi/components';
import { ControlActivity } from '../ControlActivity';
import { ActivityContext } from '../../core';
import { Task } from '../../decorators';

@Task('equals')
export class EqualsActivity extends ControlActivity<boolean> {

    @Input() expect: string;

    @Input() value: any;

    protected async execute(ctx: ActivityContext): Promise<void> {
        try {
            // tslint:disable-next-line:no-eval
            let exp = eval(this.expect);
            this.result.value = exp === this.value;
        } catch {

        }
    }
}
