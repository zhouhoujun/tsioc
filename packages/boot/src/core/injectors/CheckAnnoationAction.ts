import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { AnnotationServiceToken } from '../IAnnotationService';

export class CheckAnnoationAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        if (!ctx.reflects) {
            ctx.reflects = this.container.getTypeReflects();
        }
        if (!ctx.annoation) {
            ctx.annoation = this.container.get(AnnotationServiceToken).getAnnoation(ctx.module);
        }
        if (ctx.annoation) {
            next();
        }
    }
}
