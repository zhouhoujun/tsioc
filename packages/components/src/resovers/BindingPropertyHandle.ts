import { IBindingTypeReflect, BindingTypes } from '../bindings';
import { isNullOrUndefined } from '@tsdi/ioc';
import { BindingScope, ParseContext } from '../parses';
import { BuildContext, ResolveHandle, BuildHandleRegisterer } from '@tsdi/boot';

export class BindingPropertyHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target) {
            let { propBindings } = this.container.getTypeReflects().get(ctx.type) as IBindingTypeReflect;
            if (propBindings) {
                let registerer = this.container.get(BuildHandleRegisterer);
                await Promise.all(Array.from(propBindings.keys()).map(async n => {
                    let binding = propBindings.get(n);
                    let expression = ctx.template ? ctx.template[binding.bindingName || binding.name] : null;
                    if (!isNullOrUndefined(expression)) {
                        if (binding.bindingType === BindingTypes.dynamic) {
                            ctx.target[binding.name] = expression;
                        } else {
                            let pctx = ParseContext.parse(ctx.type, {
                                scope: ctx.scope,
                                bindExpression: expression,
                                template: ctx.template,
                                binding: binding,
                                annoation: ctx.annoation,
                                decorator: ctx.decorator,
                                raiseContainer: ctx.getContainerFactory()
                            })
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
