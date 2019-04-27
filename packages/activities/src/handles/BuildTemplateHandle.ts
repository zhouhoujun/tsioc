import { CompositeHandle } from '@tsdi/boot';
import { isArray, isNullOrUndefined } from '@tsdi/ioc';
import { ActivityContext, CompoiseActivity, IActivityReflect } from '../core';
import { BindingInputPropertyHandle, BindingArrayInputPropertyHandle } from './BindingInputPropertyHandle';


export class BuildTemplateHandle extends CompositeHandle<ActivityContext> {
    async execute(ctx: ActivityContext, next: () => Promise<void>): Promise<void> {
        let activity = ctx.getActivity();
        let template = ctx.template;
        console.log(template);
        if (template) {
            if (isArray(template)) {
                if (activity instanceof CompoiseActivity) {
                    activity.add(...template);
                }
            } else {
                let ref = this.container.getTypeReflects().get(ctx.module) as IActivityReflect;
                await Promise.all(Array.from(ref.inputBindings.keys()).map(async n => {
                    let binding = ref.inputBindings.get(n);
                    let tempVal = template[binding.bindingName || binding.name];
                    if (!isNullOrUndefined(tempVal)) {
                        ctx.currPropertyBinding = Object.assign({ bindingValue: tempVal }, binding);
                        await super.execute(ctx);
                    }
                }));
                ctx.currPropertyBinding = null;
            }
        }
        await next();
    }

    setup() {
        this.use(BindingArrayInputPropertyHandle)
            .use(BindingInputPropertyHandle);
    }
}
