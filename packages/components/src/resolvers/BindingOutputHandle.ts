import { isNullOrUndefined } from '@tsdi/ioc';
import { ResolveHandle, BuildContext, HandleRegisterer } from '@tsdi/boot';
import { IBindingTypeReflect } from '../bindings/IBindingTypeReflect';
import { ParseContext } from '../parses/ParseContext';
import { BindingScopeHandle } from '../parses/BindingValueScope';


export class BindingOutputHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target) {
            let ref = ctx.targetReflect as IBindingTypeReflect;
            if (ref && ref.propOutBindings) {
                let registerer = this.container.getInstance(HandleRegisterer);
                let options = ctx.getOptions();
                await Promise.all(Array.from(ref.propOutBindings.keys()).map(async n => {
                    let binding = ref.propOutBindings.get(n);
                    let filed = binding.bindingName || binding.name;
                    let expression = options.template ? options.template[filed] : null;
                    if (!isNullOrUndefined(expression)) {
                        let pctx = ParseContext.parse({
                            module: ctx.module,
                            scope: options.scope || ctx.target,
                            bindExpression: expression,
                            template: options.template,
                            binding: binding,
                            decorator: ctx.decorator,
                            containerFactory: ctx.getFactory()
                        })
                        await registerer.get(BindingScopeHandle).execute(pctx);
                        pctx.dataBinding.bind(ctx.target);
                    }

                }));
            }
        }
        await next();
    }
}
