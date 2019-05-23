import { getOwnTypeMetadata, lang } from '@tsdi/ioc';
import { AnnoationAction } from './AnnoationAction';
import { AnnoationActionContext } from './AnnoationActionContext';
import { ModuleConfigure } from '../modules';

export class CheckAnnoationAction extends AnnoationAction {
    execute(ctx: AnnoationActionContext, next: () => void): void {
        if (!ctx.annoation) {
            let ann = { ...lang.first(getOwnTypeMetadata<ModuleConfigure>(ctx.decorator, ctx.module)) };
            if (ann.template) {
                ann.template = lang.cloneMetadata(ann.template);
            }
            ctx.annoation = ann;
        }
        if (ctx.annoation) {
            next();
        }
    }
}
