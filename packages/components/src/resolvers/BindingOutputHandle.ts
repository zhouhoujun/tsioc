import { isNullOrUndefined } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';
import { IComponentReflect } from '../IComponentReflect';
import { ParseContext } from '../parses/ParseContext';
import { BindingScopeHandle } from '../parses/BindingValueScope';


export const BindingOutputHandle = async function (ctx: BuildContext, next: () => Promise<void>): Promise<void> {
    if (ctx.target) {
        let ref = ctx.targetReflect as IComponentReflect;
        if (ref && ref.propOutBindings) {
            let options = ctx.getOptions();
            await Promise.all(Array.from(ref.propOutBindings.keys()).map(async n => {
                let binding = ref.propOutBindings.get(n);
                let filed = binding.bindingName || binding.name;
                let expression = options.template ? options.template[filed] : null;
                if (!isNullOrUndefined(expression)) {
                    let pctx = ParseContext.parse(ctx.injector, {
                        type: ctx.type,
                        scope: options.scope || ctx.target,
                        bindExpression: expression,
                        template: options.template,
                        binding: binding,
                        decorator: ctx.decorator
                    });
                    await BindingScopeHandle(pctx);
                    pctx.dataBinding.bind(ctx.target);
                }

            }));
        }
    }
    await next();
};
