import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { IDIModuleReflect } from '../modules';
import { ModuleResovler } from './ModuleResovler';
import { ModuleDecoratorServiceToken } from '../IModuleDecoratorService';

export class RegModuleResolverAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        let annoation = ctx.annoation;
        let container = ctx.getRaiseContainer();
        let mdResolver = new ModuleResovler(annoation.token || ctx.module, annoation, container, ctx.module, ctx.exports);
        let { reflect } = container.get(ModuleDecoratorServiceToken).getReflect<IDIModuleReflect>(ctx.module, container);
        if (reflect) {
            reflect.moduleResolver = mdResolver;
        }
        ctx.moduleResolver = mdResolver;
        next();
    }
}
