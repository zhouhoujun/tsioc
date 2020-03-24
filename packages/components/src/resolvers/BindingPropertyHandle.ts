import { isTypeObject, lang, isDefined } from '@tsdi/ioc';
import { IComponentContext } from '../ComponentContext';
import { ParseContext, CTX_BIND_PARSED } from '../parses/ParseContext';
import { BindingScope } from '../parses/BindingScope';
import { IPropertyVaildate } from '../bindings/IBinding';
import { ParseBinding } from '../bindings/ParseBinding';
import { PropBinding } from '../bindings/PropBinding';
import { Input } from '../decorators/Input';
import { Vaildate } from '../decorators/Vaildate';

const inputDector = Input.toString();
/**
 * binding property handle.
 *
 * @export
 * @class BindingPropertyHandle
 * @extends {ResolveHandle}
 */
export const BindingPropertyHandle = async function (ctx: IComponentContext, next: () => Promise<void>): Promise<void> {

    let refl = ctx.getTargetReflect();
    let propInBindings = refl?.getBindings(inputDector);
    if (propInBindings) {
        let bindings = ctx.getTemplate();
        let actInjector = ctx.reflects.getActionInjector();
        await Promise.all(Array.from(propInBindings.keys()).map(async n => {
            let binding = propInBindings.get(n);
            let filed = binding.bindingName || binding.name;
            let expression = bindings ? bindings[filed] : null;
            if (isDefined(expression)) {
                if (binding.bindingType === 'dynamic') {
                    ctx.value[binding.name] = expression;
                } else {
                    let pctx = ParseContext.parse(ctx.injector, {
                        type: ctx.type,
                        parent: ctx,
                        bindExpression: expression,
                        binding: binding
                    });
                    await actInjector.getInstance(BindingScope).execute(pctx, async () => {
                        if (pctx.dataBinding instanceof ParseBinding) {
                            if (pctx.getValue(CTX_BIND_PARSED) && isTypeObject(pctx.value)) {
                                ctx.value[binding.name] = pctx.value;
                                pctx.dataBinding.bind(pctx.value);
                            } else {
                                pctx.dataBinding.bind(ctx.value, pctx.value);
                            }
                        } else if (pctx.dataBinding instanceof PropBinding) {
                            pctx.dataBinding.bind(ctx.value, pctx.value);
                        } else {
                            ctx.value[binding.name] = pctx.value;
                        }
                    });
                }
            } else if (isDefined(binding.defaultValue)) {
                ctx.value[binding.name] = binding.defaultValue;
            }

            let bvailds = refl?.getBindings<IPropertyVaildate[]>(Vaildate.toString()).get(binding.name);
            if (bvailds && bvailds.length) {
                await Promise.all(bvailds.map(async bvaild => {
                    if (bvaild.required && isDefined(ctx.value[binding.name])) {
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
