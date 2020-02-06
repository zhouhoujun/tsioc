import { StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { IComponentContext } from '../ComponentContext';


export const ValifyTeamplateHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {

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
