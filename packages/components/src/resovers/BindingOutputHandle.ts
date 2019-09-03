import { ResolveHandle, BuildContext, HandleRegisterer } from '@tsdi/boot';
import { IBindingTypeReflect } from '../bindings';

export class BindingOutputHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target) {
            let ref = ctx.targetReflect as IBindingTypeReflect;
            if (ref && ref.propOutBindings) {
                let registerer = this.container.get(HandleRegisterer);
                await Promise.all(Array.from(ref.propOutBindings.keys()).map(async n => {
                    let binding = ref.propOutBindings.get(n);
                    let expression = ctx.template ? ctx.template[binding.bindingName || binding.name] : null;

                }));
            }
        }
        await next();
    }
}
