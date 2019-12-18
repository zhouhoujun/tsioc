import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';

export class RegModuleAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        ctx.injector.register(ctx.module);
        next();
    }
}
