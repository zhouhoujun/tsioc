import { AnnoationAction } from './AnnoationAction';
import { AnnoationActionContext } from './AnnoationActionContext';
import { IDIModuleReflect } from '../modules';
import { ModuleResovler } from './ModuleResovler';

export class RegModuleResolverAction extends AnnoationAction {
    execute(ctx: AnnoationActionContext, next: () => void): void {
        let annoation = ctx.annoation;
        let container = ctx.getRaiseContainer();
        let mdResolver = new ModuleResovler(annoation.token || ctx.module, annoation, container, ctx.module, ctx.exports);
        let mRef = container.getTypeReflects().get<IDIModuleReflect>(ctx.module);
        mRef.moduleResolver = mdResolver;
        ctx.moduleResolver = mdResolver;
        next();
    }
}
