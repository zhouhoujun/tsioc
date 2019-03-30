import { getOwnTypeMetadata, lang } from '@tsdi/ioc';
import { AnnoationAction } from './AnnoationAction';
import { AnnoationActionContext } from './AnnoationActionContext';
import { ModuleConfigure } from '../modules';

export class CheckAnnoationAction extends AnnoationAction {
    execute(ctx: AnnoationActionContext, next: () => void): void {
        if (!ctx.annoation) {
            ctx.annoation = lang.first(getOwnTypeMetadata<ModuleConfigure>(ctx.decorator, ctx.type));
        }
        if (ctx.annoation) {
            next();
        }
    }
}
