import { Next } from './Handle';
import { AnnoationHandle, AnnoationContext } from './AnnoationHandle';
import { ModuleResovler, IDIModuleReflect } from '../modules';
import { Singleton } from '@ts-ioc/ioc';

@Singleton
export class RegisterModuleResolverHandle extends AnnoationHandle {

    async execute(ctx: AnnoationContext, next: Next): Promise<void> {
        let annoation = ctx.annoation;
        let mdResolver = new ModuleResovler(annoation.token || ctx.type, annoation, ctx.moduleContainer, ctx.type, ctx.exports);
        let mRef = ctx.moduleContainer.getTypeReflects().get<IDIModuleReflect>(ctx.type, true);
        mRef.moduleResolver = mdResolver;
        ctx.moduleResolver = mdResolver;
        await next();
    }

}
