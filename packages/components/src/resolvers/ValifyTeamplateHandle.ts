import { IBuildContext, StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';


export const ValifyTeamplateHandle = async function (ctx: IBuildContext, next?: () => Promise<void>): Promise<void> {

    let actInjector = ctx.reflects.getActionInjector();
    let startupRegr = actInjector.getInstance(StartupDecoratorRegisterer);

    let validRegs = startupRegr.getRegisterer(StartupScopes.ValifyComponent);
    if (validRegs.has(ctx.decorator)) {
        await this.execFuncs(ctx, validRegs.getFuncs(actInjector, ctx.decorator));
    }

    if (next) {
        await next();
    }
};
