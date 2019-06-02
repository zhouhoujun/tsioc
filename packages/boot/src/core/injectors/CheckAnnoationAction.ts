import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { ModuleDecoratorService } from '../ModuleDecoratorService';

export class CheckAnnoationAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        if (!ctx.annoation) {
            ctx.annoation = this.container.get(ModuleDecoratorService).getAnnoation(ctx.module, ctx.decorator);
        }
        if (ctx.annoation) {
            next();
        }
    }
}
