import { isNullOrUndefined } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';
import { IComponentReflect } from '../IComponentReflect';
import { ParseContext } from '../parses/ParseContext';
import { BindingScopeHandle } from '../parses/BindingValueScope';


export const BindingOutputHandle = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {
    if (ctx.value) {
        let ref = ctx.targetReflect as IComponentReflect;
        if (ref && ref.propOutBindings) {
            let template = ctx.template;
            await Promise.all(Array.from(ref.propOutBindings.keys()).map(async n => {
                let binding = ref.propOutBindings.get(n);
                let filed = binding.bindingName || binding.name;
                let expression = template ? template[filed] : null;
                if (!isNullOrUndefined(expression)) {
                    let pctx = ParseContext.parse(ctx.injector, {
                        type: ctx.type,
                        parent: ctx,
                        bindExpression: expression,
                        template: template,
                        binding: binding
                    });
                    await BindingScopeHandle(pctx);
                    pctx.dataBinding.bind(ctx.value);
                }

            }));
        }
    }
    await next();
};
