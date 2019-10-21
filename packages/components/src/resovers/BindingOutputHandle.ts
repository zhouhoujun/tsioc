import { ResolveHandle, BuildContext, HandleRegisterer } from '@tsdi/boot';
import { IBindingTypeReflect } from '../bindings';
import { isNullOrUndefined, lang } from '@tsdi/ioc';
import { ParseContext, BindingScopeHandle } from '../parses';

export class BindingOutputHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target) {
            let ref = ctx.targetReflect as IBindingTypeReflect;
            if (ref && ref.propOutBindings) {
                let registerer = this.container.getInstance(HandleRegisterer);
                let template = ctx.template ? { ...ctx.template } : {};
                await Promise.all(Array.from(ref.propOutBindings.keys()).map(async n => {
                    let binding = ref.propOutBindings.get(n);
                    let filed = binding.bindingName || binding.name;
                    let expression = ctx.template ? ctx.template[filed] : null;
                    if (isNullOrUndefined(expression)) {
                        expression = template[filed];
                    } else {
                        delete ctx.template[filed];
                    }

                    if (!isNullOrUndefined(expression)) {
                        let pctx = ParseContext.parse(ctx.type, {
                            scope: ctx.scope,
                            bindExpression: expression,
                            template: ctx.template,
                            binding: binding,
                            annoation: ctx.annoation,
                            decorator: ctx.decorator,
                            raiseContainer: ctx.getContainerFactory()
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
