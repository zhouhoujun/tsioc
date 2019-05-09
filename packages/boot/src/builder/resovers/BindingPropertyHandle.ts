import { IBindingTypeReflect } from '../../core';
import { BuildContext } from './BuildContext';
import { isNullOrUndefined } from '@tsdi/ioc';
import { ParseScope, ParseContext } from '../parses';
import { ResolveHandle } from './ResolveHandle';

export class BindingPropertyHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        let ref = this.container.getTypeReflects().get(ctx.type) as IBindingTypeReflect;
        if (ref.propBindings) {
            await Promise.all(Array.from(ref.propBindings.keys()).map(async n => {
                let binding = ref.propBindings.get(n);
                let tempVal = ctx.template[binding.bindingName || binding.name];
                if (!isNullOrUndefined(tempVal)) {
                    let pctx = ParseContext.parse(ctx.type, {
                        template: tempVal,
                        binding: binding,
                        annoation: ctx.annoation,
                        decorator: ctx.decorator
                    }, ctx.getRaiseContainer())
                    await this.container.get(ParseScope)
                        .execute(pctx);
                    ctx.target[binding.name] = pctx.bindingValue;
                }
            }));
        }
        await next();
    }
}
