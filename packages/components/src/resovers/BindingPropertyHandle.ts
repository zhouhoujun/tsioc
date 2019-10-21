import { IBindingTypeReflect, BindingTypes, DataBinding, ParseBinding } from '../bindings';
import { isNullOrUndefined, isTypeObject, isBaseValue, lang } from '@tsdi/ioc';
import { BindingScope, ParseContext } from '../parses';
import { BuildContext, ResolveHandle, HandleRegisterer } from '@tsdi/boot';

/**
 * binding property handle.
 *
 * @export
 * @class BindingPropertyHandle
 * @extends {ResolveHandle}
 */
export class BindingPropertyHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target) {
            let ref = ctx.targetReflect as IBindingTypeReflect;
            if (ref && ref.propInBindings) {
                let registerer = this.container.getInstance(HandleRegisterer);
                let template = ctx.template ? { ...ctx.template } : {};
                await Promise.all(Array.from(ref.propInBindings.keys()).map(async n => {
                    let binding = ref.propInBindings.get(n);
                    let filed = binding.bindingName || binding.name;
                    let expression = ctx.template ? ctx.template[filed] : null;
                    if (isNullOrUndefined(expression)) {
                        expression = template[filed];
                    } else {
                        delete ctx.template[filed];
                    }
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

                            if (pctx.dataBinding instanceof ParseBinding) {
                                if (pctx.dataBinding.getSourceValue() === pctx.value || isBaseValue(pctx.value)) {
                                    pctx.dataBinding.bind(ctx.target);
                                } else if (isTypeObject(pctx.value)) {
                                    pctx.dataBinding.bind(pctx.value, ctx.target);
                                }
                            } else if (pctx.dataBinding instanceof DataBinding) {
                                pctx.dataBinding.bind(ctx.target);
                            } else {
                                ctx.target[binding.name] = pctx.value;
                            }
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
