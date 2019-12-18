import { IocCompositeAction, InjectorToken, IActionSetup } from '@tsdi/ioc';
import { AnnoationContext } from '../AnnoationContext';
import { RegModuleAction } from './RegModuleAction';
import { RegModuleImportsAction } from './RegModuleImportsAction';
import { RegModuleProvidersAction } from './RegModuleProvidersAction';
import { RegModuleRefAction } from './RegModuleRefAction';

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
