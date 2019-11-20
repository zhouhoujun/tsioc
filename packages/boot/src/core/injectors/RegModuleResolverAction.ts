import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext, CTX_MODULE_RESOLVER } from '../AnnoationContext';
import { IDIModuleReflect } from '../modules';
import { ModuleResovler } from './ModuleResovler';

export class RegModuleResolverAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        let container = ctx.getRaiseContainer();
        let mdResolver = new ModuleResovler(ctx.annoation.token || ctx.module, container, ctx.module, ctx.exports);
        let reflect = ctx.reflects.get<IDIModuleReflect>(ctx.module);
        if (reflect) {
            reflect.moduleResolver = mdResolver;
        }
        ctx.setContext(CTX_MODULE_RESOLVER, mdResolver);
        next();
    }
}
