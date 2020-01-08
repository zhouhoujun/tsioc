import { isNullOrUndefined, isTypeObject, isBaseValue, lang, ActionInjectorToken } from '@tsdi/ioc';
import { BuildContext, ResolveHandle } from '@tsdi/boot';
import { ParseContext } from '../parses/ParseContext';
import { BindingScope } from '../parses/BindingScope';
import { IComponentReflect } from '../IComponentReflect';
import { BindingTypes } from '../bindings/IBinding';
import { ParseBinding } from '../bindings/ParseBinding';
import { DataBinding } from '../bindings/DataBinding';


/**
 * binding property handle.
 *
 * @export
 * @class BindingPropertyHandle
 * @extends {ResolveHandle}
 */
export const BindingPropertyHandle = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {
    if (ctx.target) {
        let ref = ctx.targetReflect as IComponentReflect;
        if (ref && ref.propInBindings) {
            let options = ctx.getOptions();
            let actInjector = ctx.injector.get(ActionInjectorToken);
            await Promise.all(Array.from(ref.propInBindings.keys()).map(async n => {
                let binding = ref.propInBindings.get(n);
                let filed = binding.bindingName || binding.name;
                let expression = options.template ? options.template[filed] : null;
                if (!isNullOrUndefined(expression)) {
                    if (binding.bindingType === BindingTypes.dynamic) {
                        ctx.target[binding.name] = expression;
                    } else {
                        let pctx = ParseContext.parse(ctx.injector, {
                            type: ctx.type,
                            scope: options.scope || ctx.target,
                            bindExpression: expression,
                            template: options.template,
                            binding: binding,
                            decorator: ctx.decorator
                        });
                        await actInjector.getInstance(BindingScope).execute(pctx);

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
};
