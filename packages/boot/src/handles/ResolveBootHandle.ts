import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { lang, ProviderTypes, isNullOrUndefined, InjectReference, RuntimeLifeScope, isClass, isClassType } from '@tsdi/ioc';
import { IBindingTypeReflect } from '../core';
import { TemplateTranlator } from '../services';


export class ResolveBootHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (ctx.annoation.bootstrap && !ctx.bootstrap) {
            let container = ctx.getRaiseContainer();
            let bootType = container.getTokenProvider(ctx.annoation.bootstrap);
            let providers: ProviderTypes[] = [];
            if (isClassType(bootType)) {
                let ref = container.getTypeReflects().get(bootType) as IBindingTypeReflect;
                // init if not init constructor params action.
                if (!ref.methodParams.has('constructor')) {
                    container.get(RuntimeLifeScope).getConstructorParameters(container, bootType);
                }
                if (ref.paramsBindings) {
                    let bparams = ref.paramsBindings.get('constructor');
                    if (bparams && bparams.length) {
                        await Promise.all(bparams.map(async bp => {
                            let paramVal = await container.getService(TemplateTranlator, bootType).resolve(ctx.template, bp);
                            if (!isNullOrUndefined(paramVal)) {
                                providers.push({ provide: new InjectReference(bp.provider || bp.type || bp.name, '__binding'), useValue: paramVal });
                            }
                        }));
                    }
                }
            }
            ctx.bootstrap = this.resolve(ctx, ctx.annoation.bootstrap, ...[...providers, { provide: BootContext, useValue: ctx }, { provide: lang.getClass(ctx), useValue: ctx }]);
        }
        if (ctx.bootstrap) {
            ctx.currTarget = ctx.bootstrap;
            await next();
        }
    }
}
