import { CompositeHandle } from '../../core';
import { BuildContext } from './BuildContext';
import { BindingPropertyHandle } from './BindingPropertyHandle';


export class BindingScope extends CompositeHandle<BuildContext> {
    async execute(ctx: BuildContext, next: () => Promise<void>): Promise<void> {
        if (ctx.target && ctx.template) {
            await super.execute(ctx, next);
        } else {
            await next();
        }
    }

    setup() {
        this.use(BindingPropertyHandle);
    }
}
