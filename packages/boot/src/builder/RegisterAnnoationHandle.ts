import { lang } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { AnnoationHandle } from './AnnoationHandle';
import { AnnotationServiceToken } from '../services/IAnnotationService';
import { ModuleInjectLifeScope } from '../injectors/ModuleInjectLifeScope';


export class RegisterAnnoationHandle extends AnnoationHandle {

    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let dec = ctx.getContainer().get(AnnotationServiceToken).getDecorator(ctx.module);
        if (dec) {
            this.actInjector.get(ModuleInjectLifeScope).register(ctx.injector, ctx.module, dec);

            await next();
        } else {
            console.log(ctx.module);
            throw new Error(`boot type [${lang.getClassName(ctx.module)}] is not vaild annoation class.`);
        }
    }
}
