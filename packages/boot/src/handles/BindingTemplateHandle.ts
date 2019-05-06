import { isNullOrUndefined } from '@tsdi/ioc';
import { BindingInputPropertyHandle, BindingArrayInputPropertyHandle } from './BindingInputPropertyHandle';
import { CompositeHandle, IBindingTypeReflect } from '../core';
import { BootContext } from '../BootContext';


export class BindingTemplateHandle extends CompositeHandle<BootContext> {
    async execute(ctx: BootContext, next: () => Promise<void>): Promise<void> {
        let template = ctx.template;
        if (template) {
            let ref = this.container.getTypeReflects().get(ctx.module) as IBindingTypeReflect;
            await Promise.all(Array.from(ref.propBindings.keys()).map(async n => {
                let binding = ref.propBindings.get(n);
                let tempVal = template[binding.bindingName || binding.name];
                if (!isNullOrUndefined(tempVal)) {
                    ctx.currPropertyBinding = Object.assign({ bindingValue: tempVal }, binding);
                    await super.execute(ctx);
                }
            }));
            ctx.currPropertyBinding = null;

        }
        await next();
    }

    setup() {
        this.use(BindingArrayInputPropertyHandle)
            .use(BindingInputPropertyHandle);
    }
}
