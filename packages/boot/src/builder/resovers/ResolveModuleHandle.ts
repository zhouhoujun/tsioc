import { BuildContext } from './BuildContext';
import { ResolveHandle } from './ResolveHandle';
import { IBindingTypeReflect, HandleRegisterer, BindingTypes } from '../../core';
import { RuntimeLifeScope, isNullOrUndefined, isArray, InjectReference } from '@tsdi/ioc';
import { ParseContext, BindingScope } from '../parses';


export class ResolveModuleHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (!ctx.target) {
            ctx.providers = ctx.providers || [];
            let pArgs = await this.bindArgs(ctx);
            ctx.target = this.resolve(ctx, ctx.type, ...[...ctx.providers, ...pArgs]);
        }

        if (ctx.target) {
            await next();
        }
    }

    async bindArgs(ctx: BuildContext) {
        if (!this.isComponent(ctx)) {
            return [];
        }
        let container = ctx.getRaiseContainer();
        let providers = [];
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
                        let bindExpression = isArray(ctx.template) ? ctx.template : ctx.template[bp.bindingName || bp.name];
                        if (bp.bindingType === BindingTypes.dynamic) {
                            paramVal = bindExpression;
                        } else {
                            let pctx = ParseContext.parse(ctx.type, {
                                scope: ctx.scope,
                                bindExpression: bindExpression,
                                binding: bp,
                                template: ctx.template,
                                annoation: ctx.annoation,
                                decorator: ctx.decorator
                            }, ctx.getRaiseContainer());
                            await hregisterer.get(BindingScope).execute(pctx);
                            paramVal = pctx.value;
                        }
                    } else if (!isNullOrUndefined(bp.defaultValue)) {
                        paramVal = bp.defaultValue;
                    }
                    if (!isNullOrUndefined(paramVal)) {
                        providers.unshift({ provide: new InjectReference(bp.provider || bp.bindingName || bp.name, '__binding'), useValue: paramVal });
                    }
                }));
            }
        }

        return providers;

    }

}
