import { IBindingTypeReflect, Handle } from '../../core';
import { InjectReference, ProviderTypes, isNullOrUndefined, RuntimeLifeScope } from '@tsdi/ioc';
import { TemplateTranlator } from '../../services';
import { BuildContext,  } from './BuildContext';


export class ResolveModuleHandle extends Handle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.target) {
            let container = ctx.getRaiseContainer();
            let ref = container.getTypeReflects().get(ctx.type) as IBindingTypeReflect;
            // init if not init constructor params action.
            if (!ref.methodParams.has('constructor')) {
                container.get(RuntimeLifeScope).getConstructorParameters(container, ctx.type);
            }
            ctx.providers = ctx.providers || [];
            if (ref.paramsBindings) {
                let bparams = ref.paramsBindings.get('constructor');
                if (bparams && bparams.length) {
                    await Promise.all(bparams.map(async bp => {
                        let paramVal = await container.getService(TemplateTranlator, ctx.type).resolve(ctx.template, bp);
                        if (!isNullOrUndefined(paramVal)) {
                            ctx.providers.push({ provide: new InjectReference(bp.provider || bp.type || bp.name, '__binding'), useValue: paramVal });
                        }
                    }));
                }
            }
            ctx.target = this.resolve(ctx, ctx.type, ...ctx.providers);
        }
        if (ctx.target) {
            await next();
        }
    }
}
