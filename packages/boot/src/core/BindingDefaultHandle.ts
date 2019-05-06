import { BindingHandle } from './BindingHandle';
import { BindingContext } from './BindingContext';

export class BindingDefaultHandle extends BindingHandle {
    async execute(ctx: BindingContext, next: () => Promise<void>): Promise<void> {
        if (this.isEmpty(ctx)) {
            ctx.bindingValue = ctx.binding.defaultValue;
        }
        if (this.isEmpty(ctx)) {
            await next();
        }
    }
}
