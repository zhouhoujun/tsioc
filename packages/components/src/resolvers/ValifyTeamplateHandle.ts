import { BuildContext, ResolveHandle, StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { ViewRef } from '../ComponentRef';

export class ValifyTeamplateHandle extends ResolveHandle {
    async execute(ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
        if (ctx.target && ctx.has(ViewRef)) {
            // let refs = this.container.get(ComponentRefsToken);
            // let options = ctx.getOptions();
            // if (options.scope) {
            //     compRef.hostView.$parent = refs.get(options.scope).hostView;
            // }

            let startupRegr = this.actInjector.getInstance(StartupDecoratorRegisterer);

            let validRegs = startupRegr.getRegisterer(StartupScopes.ValifyComponent);
            if (validRegs.has(ctx.decorator)) {
                await this.execFuncs(ctx, validRegs.getFuncs(this.actInjector, ctx.decorator));
            }

            // if (ctx.has(ComponentRef)) {
            //     let compRef = ctx.get(ComponentRef);
            //     mgr.setComposite(ctx.target, ctx.composite);
            // }
        }

        if (next) {
            await next();
        }
    }

}
