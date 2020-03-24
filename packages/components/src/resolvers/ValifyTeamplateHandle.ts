import { StartupDecoratorRegisterer, StartupScopes } from '@tsdi/boot';
import { IComponentContext } from '../ComponentContext';
import { chain } from '@tsdi/ioc';


export const ValifyTeamplateHandle = async function (ctx: IComponentContext, next?: () => Promise<void>): Promise<void> {

    let actInjector = ctx.reflects.getActionInjector();
    let startupRegr = actInjector.getInstance(StartupDecoratorRegisterer);

    let validRegs = startupRegr.getRegisterer(StartupScopes.ValifyComponent);
    if (validRegs.has(ctx.decorator)) {
        await chain(validRegs.getFuncs(actInjector, ctx.decorator), ctx);
    }

    if (next) {
        await next();
    }
};
