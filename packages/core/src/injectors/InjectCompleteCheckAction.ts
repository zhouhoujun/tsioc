import { InjectAction } from './InjectAction';
import { InjectActionContext } from './InjectActionContext';

export class InjectCompleteCheckAction extends InjectAction {
    execute(ctx: InjectActionContext, next: () => void): void {
        if (ctx.types.length > 0) {
            next();
        }
    }
}
