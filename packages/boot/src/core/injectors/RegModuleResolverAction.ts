import { AnnoationAction } from './AnnoationAction';
import { AnnoationActionContext } from './AnnoationActionContext';
import { ModuleResovler, IDIModuleReflect } from '../modules';

export class RegModuleResolverAction extends AnnoationAction {
    execute(ctx: AnnoationActionContext, next: () => void): void {
        let annoation = ctx.annoation;
        let container = ctx.getRaiseContainer();
        let mdResolver = new ModuleResovler(annoation.token || ctx.type, annoation, container, ctx.type, ctx.exports);
        let mRef = container.getTypeReflects().get<IDIModuleReflect>(ctx.type);
        mRef.moduleResolver = mdResolver;
        ctx.moduleResolver = mdResolver;
        next();
    }
}
