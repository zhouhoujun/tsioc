import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';

export class RegModuleImportsAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        if (ctx.annoation.imports) {
            ctx.getContainer().use(...ctx.annoation.imports);
        }
        next();
    }
}
