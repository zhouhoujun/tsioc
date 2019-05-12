import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { RuntimeLifeScope, isNullOrUndefined, InjectReference } from '@tsdi/ioc';
import { IBindingTypeReflect } from '../../core';
import { ParseContext, ParseScope } from '../parses';

export class InitBindingParamHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        let container = ctx.getRaiseContainer();
        let register = container.getActionRegisterer();
        ctx.providers = ctx.providers || [];
        if (ctx.template) {
            let ref = container.getTypeReflects().get(ctx.type) as IBindingTypeReflect;
            // init if not init constructor params action.
            if (!ref.methodParams.has('constructor')) {
                register.get(RuntimeLifeScope).getConstructorParameters(container, ctx.type);
            }
            if (ref.paramsBindings) {
                let bparams = ref.paramsBindings.get('constructor');
                if (bparams && bparams.length) {
                    await Promise.all(bparams.map(async bp => {
                        let pCtx = ParseContext.parse(ctx.type, {
                            template: ctx.template,
                            binding: bp,
                            annoation: ctx.annoation,
                            decorator: ctx.decorator
                        }, ctx.getRaiseContainer());
                        await this.container.get(ParseScope).execute(pCtx);
                        let paramVal = pCtx.bindingValue;

                        if (!isNullOrUndefined(paramVal)) {
                            ctx.providers.push({ provide: new InjectReference(bp.provider || bp.type || bp.name, '__binding'), useValue: paramVal });
                        }
                    }));
                }
            }
        }
        await next();
    }
}
