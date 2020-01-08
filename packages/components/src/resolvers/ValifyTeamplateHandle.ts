import { BuildContext, StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { CTX_COMPONENT_REF } from '../ComponentRef';


export const ValifyTeamplateHandle = async function (ctx: BuildContext, next?: () => Promise<void>): Promise<void> {
    if (ctx.target && ctx.has(CTX_COMPONENT_REF)) {

        let startupRegr = this.actInjector.getInstance(StartupDecoratorRegisterer);

        let validRegs = startupRegr.getRegisterer(StartupScopes.ValifyComponent);
        if (validRegs.has(ctx.decorator)) {
            await this.execFuncs(ctx, validRegs.getFuncs(this.actInjector, ctx.decorator));
        }
    }

    if (next) {
        await next();
    }
};
