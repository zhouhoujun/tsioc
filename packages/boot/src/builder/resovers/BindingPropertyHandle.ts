import { IBindingTypeReflect, HandleRegisterer, BindingTypes } from '../../core';
import { BuildContext } from './BuildContext';
import { isNullOrUndefined } from '@tsdi/ioc';
import { BindingScope, ParseContext } from '../parses';
import { ResolveHandle } from './ResolveHandle';

export class BindingPropertyHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target) {
            let ref = this.container.getTypeReflects().get(ctx.type) as IBindingTypeReflect;
            if (ref.propBindings) {
                let registerer = this.container.get(HandleRegisterer);
                await Promise.all(Array.from(ref.propBindings.keys()).map(async n => {
                    let binding = ref.propBindings.get(n);
                    let expression = ctx.template ? ctx.template[binding.bindingName || binding.name] : null;
                    if (!isNullOrUndefined(expression)) {
                        if (binding.bindingType === BindingTypes.dynamic) {
                            ctx.target[binding.name] = expression;
                        } else {
                            let pctx = ParseContext.parse(ctx.type, {
                                scope: ctx.scope,
                                bindExpression: expression,
                                binding: binding,
                                annoation: ctx.annoation,
                                decorator: ctx.decorator
                            }, ctx.getRaiseContainer())
                            await registerer.get(BindingScope).execute(pctx);
                            ctx.target[binding.name] = pctx.value;
                        }
                    } else if (!isNullOrUndefined(binding.defaultValue)) {
                        ctx.target[binding.name] = binding.defaultValue;
                    }
                }));
            }
        }
        await next();
    }
}
