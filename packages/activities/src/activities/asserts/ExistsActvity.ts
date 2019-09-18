
import { Input } from '@tsdi/components';
import { isNullOrUndefined } from '@tsdi/ioc';
import { ActivityContext } from '../../core';
import { Task } from '../../decorators';
import { ControlerActivity } from '../ControlerActivity';

@Task('exists')
export class ExistsActvity extends ControlerActivity<boolean> {

    @Input() expect: string;

    protected async execute(ctx: ActivityContext): Promise<void> {
        try {
            // tslint:disable-next-line:no-eval
            let exp = eval(this.expect);
            this.result.value = !isNullOrUndefined(exp);
        } catch {

        }
    }
}
