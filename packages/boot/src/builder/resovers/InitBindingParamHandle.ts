import { ResolveHandle } from './ResolveHandle';
import { BuildContext } from './BuildContext';
import { RuntimeLifeScope, isNullOrUndefined, InjectReference, isArray } from '@tsdi/ioc';
import { IBindingTypeReflect, HandleRegisterer } from '../../core';
import { ParseContext, BindingScope } from '../parses';

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
            ctx.argsProviders = [];
            if (ref.paramsBindings) {
                let hregisterer = this.container.get(HandleRegisterer);
                let bparams = ref.paramsBindings.get('constructor');
                if (bparams && bparams.length) {
                    await Promise.all(bparams.map(async bp => {
                        let paramVal;
                        if (!isNullOrUndefined(ctx.template)) {
                            let bindExpression = isArray(ctx.template) ? ctx.template : ctx.template[bp.bindingName || bp.name];
                            let pctx = ParseContext.parse(ctx.type, {
                                scope: ctx.scope,
                                bindExpression: bindExpression,
                                template: isArray(ctx.template) ? undefined : ctx.template,
                                binding: bp,
                                annoation: ctx.annoation,
                                decorator: ctx.decorator
                            }, ctx.getRaiseContainer());
                            await hregisterer.get(BindingScope).execute(pctx);
                            paramVal = pctx.value;
                        } else if (!isNullOrUndefined(bp.defaultValue)) {
                            paramVal = bp.defaultValue;
                        }
                        if (!isNullOrUndefined(paramVal)) {
                            ctx.argsProviders.push({ provide: new InjectReference(bp.provider || bp.bindingName || bp.name, '__binding'), useValue: paramVal });
                        }
                    }));
                }
            }
        }
        await next();
    }
}
