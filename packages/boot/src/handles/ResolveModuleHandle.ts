import { BootHandle } from './BootHandle';
import { BootContext } from '../BootContext';
import { IBindingTypeReflect } from '../core';
import { InjectReference, ProviderTypes, isNullOrUndefined, RuntimeParamScope, RuntimeLifeScope } from '@tsdi/ioc';
import { TemplateTranlator } from '../services';


export class ResolveModuleHandle extends BootHandle {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.target) {
            let container = ctx.getRaiseContainer();
            let ref = container.getTypeReflects().get(ctx.module) as IBindingTypeReflect;
            let providers: ProviderTypes[] = [];
            // init if not init constructor params action.
            if (!ref.methodParams.has('constructor')) {
                container.get(RuntimeLifeScope).getConstructorParameters(container, ctx.module);
            }
            if (ref.paramsBindings) {
                let bparams = ref.paramsBindings.get('constructor');
                if (bparams && bparams.length) {
                    await Promise.all(bparams.map(async bp => {
                        let paramVal = await container.getService(TemplateTranlator, ctx.module).resolve(ctx.template, bp);
                        if (!isNullOrUndefined(paramVal)) {
                            providers.push({ provide: new InjectReference(bp.provider || bp.type || bp.name, '__binding'), useValue: paramVal });
                        }
                    }));
                }
            }
            ctx.target = this.resolve(ctx, ctx.module, ...[...providers, ...(ctx.providers || [])]);
        }
        if (ctx.target) {
            ctx.currTarget = ctx.target;
            await next();
        }
    }
}
