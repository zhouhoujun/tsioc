import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { IDIModuleReflect } from '../modules';
import { ModuleResovler } from './ModuleResovler';
import { CTX_MODULE_RESOLVER, CTX_MODULE_EXPORTS } from '../../context-tokens';

export class RegModuleResolverAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        let container = ctx.getContainer();
        let mdResolver = new ModuleResovler(ctx.annoation.token || ctx.module, container, ctx.module, ctx.get(CTX_MODULE_EXPORTS));
        let reflect = ctx.reflects.get<IDIModuleReflect>(ctx.module);
        if (reflect) {
            reflect.moduleResolver = mdResolver;
        }
        ctx.set(CTX_MODULE_RESOLVER, mdResolver);
        next();
    }
}
