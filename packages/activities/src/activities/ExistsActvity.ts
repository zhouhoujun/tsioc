import { isNil } from '@tsdi/ioc';
import { Input } from '@tsdi/components';
import { Task } from '../metadata/decor';
import { IActivityContext } from '../core/IActivityContext';
import { ControlActivity } from '../core/ControlActivity';

@Task('exists')
export class ExistsActvity extends ControlActivity<boolean> {

    @Input() exists: string;

    async execute(ctx: IActivityContext): Promise<boolean> {
        let exp = ctx.getExector().eval(this.exists);
        return !isNil(exp);
    }
}
