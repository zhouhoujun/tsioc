import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';

export class RegModuleAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        ctx.getContainer().register(ctx.module);
        next();
    }
}
