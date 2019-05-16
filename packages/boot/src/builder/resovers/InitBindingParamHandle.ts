import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { RuntimeLifeScope, isNullOrUndefined, InjectReference } from '@tsdi/ioc';
import { IBindingTypeReflect, HandleRegisterer } from '../../core';
import { ParseContext, ParseScope } from '../parses';

export class InitBindingParamHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (this.isComponent(ctx)) {
            let container = ctx.getRaiseContainer();
            ctx.providers = ctx.providers || [];
            let register = this.container.getActionRegisterer();
            let ref = container.getTypeReflects().get(ctx.type) as IBindingTypeReflect;
            // init if not init constructor params action.
            if (!ref.methodParams.has('constructor')) {
                register.get(RuntimeLifeScope).getConstructorParameters(container, ctx.type);
            }
            if (ref.paramsBindings) {
                let hregisterer = this.container.get(HandleRegisterer);
                let bparams = ref.paramsBindings.get('constructor');
                if (bparams && bparams.length) {
                    await Promise.all(bparams.map(async bp => {
                        let paramVal;
                        if (!isNullOrUndefined(ctx.template)) {
                            let pCtx = ParseContext.parse(ctx.type, {
                                scope: ctx.scope,
                                template: ctx.template,
                                binding: bp,
                                annoation: ctx.annoation,
                                decorator: ctx.decorator
                            }, ctx.getRaiseContainer());
                            await hregisterer.get(ParseScope).execute(pCtx);
                            paramVal = pCtx.value;
                        } else if (!isNullOrUndefined(bp.defaultValue)) {
                            paramVal = bp.defaultValue;
                        }

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
