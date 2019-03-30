import { AnnoationAction } from './AnnoationAction';
import { AnnoationActionContext } from './AnnoationActionContext';

export class RegModuleImportsAction extends AnnoationAction {
    execute(ctx: AnnoationActionContext, next: () => void): void {
        if (ctx.annoation.imports) {
            ctx.getRaiseContainer().use(...ctx.annoation.imports);
        }
        next();
    }
}
