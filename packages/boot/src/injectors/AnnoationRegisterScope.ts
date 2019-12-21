import { IocCompositeAction, InjectorToken, IActionSetup } from '@tsdi/ioc';
import { AnnoationContext } from '../AnnoationContext';
import { RegModuleAction } from './RegModuleAction';
import { RegModuleImportsAction } from './RegModuleImportsAction';
import { RegModuleProvidersAction } from './RegModuleProvidersAction';
import { RegModuleRefAction } from './RegModuleRefAction';
import { ModuleInjector } from '../modules/ModuleInjector';
import { ParentInjectorToken } from '../modules/IModuleReflect';

/**
 * annoation register scope.
 *
 * @export
 * @class AnnoationRegisterScope
 * @extends {IocCompositeAction<AnnoationContext>}
 */
export class AnnoationRegisterScope extends IocCompositeAction<AnnoationContext> implements IActionSetup {
    execute(ctx: AnnoationContext, next?: () => void): void {

        if (ctx.regFor === 'root') {
            ctx.set(InjectorToken, ctx.getContainer());
        } else {
            let injector = ctx.injector.get(ModuleInjector);
            injector.registerValue(ParentInjectorToken, ctx.injector);
            ctx.set(InjectorToken, injector);
        }

        return super.execute(ctx, next);

    }

    setup() {
        this.use(RegModuleAction)
            .use(RegModuleImportsAction)
            .use(RegModuleProvidersAction)
            .use(RegModuleRefAction);
    }
}
