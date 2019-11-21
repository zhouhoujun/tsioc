import { isNullOrUndefined, isTypeObject, isBaseValue, lang } from '@tsdi/ioc';
import { BuildContext, ResolveHandle, HandleRegisterer } from '@tsdi/boot';
import { BindingScope, ParseContext } from '../parses';
import { IBindingTypeReflect, BindingTypes, DataBinding, ParseBinding } from '../bindings';


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
                let options = ctx.getOptions();
                await Promise.all(Array.from(ref.propInBindings.keys()).map(async n => {
                    let binding = ref.propInBindings.get(n);
                    let filed = binding.bindingName || binding.name;
                    let expression = options.template ? options.template[filed] : null;
                    if (!isNullOrUndefined(expression)) {
                        if (binding.bindingType === BindingTypes.dynamic) {
                            ctx.target[binding.name] = expression;
                        } else {
                            let pctx = ParseContext.parse({
                                module: ctx.module,
                                scope: options.scope || ctx.target,
                                bindExpression: expression,
                                template: options.template,
                                binding: binding,
                                decorator: ctx.decorator,
                                raiseContainer: ctx.getContainerFactory()
                            })
                            await registerer.get(BindingScope).execute(pctx);

                            if (pctx.dataBinding instanceof ParseBinding) {
                                if (pctx.dataBinding.resolveExression() === pctx.value || isBaseValue(pctx.value)) {
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

                    let bvailds = ref.propVaildates ? ref.propVaildates.get(binding.name) : null;
                    if (bvailds && bvailds.length) {
                        await Promise.all(bvailds.map(async bvaild => {
                            if (bvaild.required && !isNullOrUndefined(ctx.target[binding.name])) {
                                throw new Error(`${lang.getClassName(ctx.target)}.${binding.name} is not vaild. ${bvaild.errorMsg}`)
                            }
                            if (bvaild.vaild) {
                                let vaild = await bvaild.vaild(ctx.target[binding.name], ctx.target);
                                if (!vaild) {
                                    throw new Error(`${lang.getClassName(ctx.target)}.${binding.name} is not vaild. ${bvaild.errorMsg}`)
                                }
                            }
                        }));
                    }
                }));
            }
        }
        await next();
    }
}
