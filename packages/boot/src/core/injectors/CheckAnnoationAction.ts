import { AnnoationAction } from './AnnoationAction';
import { AnnoationActionContext } from './AnnoationActionContext';
import { ModuleDecoratorService } from '../ModuleDecoratorService';

export class CheckAnnoationAction extends AnnoationAction {
    execute(ctx: AnnoationActionContext, next: () => void): void {
        if (!ctx.annoation) {
            ctx.annoation = this.container.get(ModuleDecoratorService).getAnnoation(ctx.module, ctx.decorator);
        }
        if (ctx.annoation) {
            next();
        }
    }
}
