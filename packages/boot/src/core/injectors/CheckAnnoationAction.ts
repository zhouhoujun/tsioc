import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';


/**
 * check annoation action.
 *
 * @export
 * @class CheckAnnoationAction
 * @extends {AnnoationAction}
 */
export class CheckAnnoationAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        if (ctx.annoation) {
            next();
        }
    }
}
