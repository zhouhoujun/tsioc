import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { AnnotationServiceToken } from '../IAnnotationService';

/**
 * check annoation action.
 *
 * @export
 * @class CheckAnnoationAction
 * @extends {AnnoationAction}
 */
export class CheckAnnoationAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        // if (!ctx.targetReflect) {
        //     ctx.targetReflect = ctx.reflects.get(ctx.module);
        // }
        if (!ctx.annoation) {
            ctx.annoation = (ctx.targetReflect && ctx.targetReflect.getAnnoation) ? ctx.targetReflect.getAnnoation() : this.container.get(AnnotationServiceToken).getAnnoation(ctx.module, ctx.decorator);
        }
        if (ctx.annoation) {
            next();
        }
    }
}
