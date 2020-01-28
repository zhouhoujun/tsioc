import { isNullOrUndefined, isTypeObject, isBaseValue, lang } from '@tsdi/ioc';
import { IBuildContext } from '@tsdi/boot';
import { ParseContext } from '../parses/ParseContext';
import { BindingScope } from '../parses/BindingScope';
import { IComponentReflect } from '../IComponentReflect';
import { BindingTypes, IPropertyVaildate } from '../bindings/IBinding';
import { ParseBinding } from '../bindings/ParseBinding';
import { DataBinding } from '../bindings/DataBinding';
import { Input } from '../decorators/Input';
import { Vaildate } from '../decorators/Vaildate';


/**
 * binding property handle.
 *
 * @export
 * @class BindingPropertyHandle
 * @extends {ResolveHandle}
 */
export const BindingPropertyHandle = async function (ctx: IBuildContext, next: () => Promise<void>): Promise<void> {

    let refl = ctx.targetReflect as IComponentReflect;
    let propInBindings = refl?.getBindings(Input.toString());
    if (propInBindings) {
        let template = ctx.template;
        let actInjector = ctx.reflects.getActionInjector();
        await Promise.all(Array.from(propInBindings.keys()).map(async n => {
            let binding = propInBindings.get(n);
            let filed = binding.bindingName || binding.name;
            let expression = template ? template[filed] : null;
            if (!isNullOrUndefined(expression)) {
                if (binding.bindingType === BindingTypes.dynamic) {
                    ctx.value[binding.name] = expression;
                } else {
                    let pctx = ParseContext.parse(ctx.injector, {
                        type: ctx.type,
                        parent: ctx,
                        bindExpression: expression,
                        binding: binding
                    });
                    await actInjector.getInstance(BindingScope).execute(pctx);
                    if (pctx.dataBinding instanceof ParseBinding) {
                        if (pctx.dataBinding.resolveExression() === pctx.value || isBaseValue(pctx.value)) {
                            pctx.dataBinding.bind(ctx.value);
                        } else if (isTypeObject(pctx.value)) {
                            pctx.dataBinding.bind(pctx.value, ctx.value);
                        }
                    } else if (pctx.dataBinding instanceof DataBinding) {
                        pctx.dataBinding.bind(ctx.value);
                    } else {
                        ctx.value[binding.name] = pctx.value;
                    }
                }
            } else if (!isNullOrUndefined(binding.defaultValue)) {
                ctx.value[binding.name] = binding.defaultValue;
            }

            let bvailds = refl?.getBindings<IPropertyVaildate[]>(Vaildate.toString()).get(binding.name);
            if (bvailds && bvailds.length) {
                await Promise.all(bvailds.map(async bvaild => {
                    if (bvaild.required && !isNullOrUndefined(ctx.value[binding.name])) {
                        throw new Error(`${lang.getClassName(ctx.value)}.${binding.name} is not vaild. ${bvaild.errorMsg}`)
                    }
                    if (bvaild.vaild) {
                        let vaild = await bvaild.vaild(ctx.value[binding.name], ctx.value);
                        if (!vaild) {
                            throw new Error(`${lang.getClassName(ctx.value)}.${binding.name} is not vaild. ${bvaild.errorMsg}`)
                        }
                    }
                }));
            }
        }));
    }
    await next();
};
