import { AnnoationAction } from './AnnoationAction';
import { AnnoationActionContext } from './AnnoationActionContext';

export class RegModuleAction extends AnnoationAction {
    execute(ctx: AnnoationActionContext, next: () => void): void {
        ctx.getRaiseContainer().register(ctx.type);
        next();
    }
}
