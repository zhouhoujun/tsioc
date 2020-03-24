import { IocRegScope, DesignContext, IActionSetup } from '@tsdi/ioc';
import { CTX_MODULE_ANNOATION } from '../context-tokens';
import { RegModuleImportsAction } from './RegModuleImportsAction';
import { RegModuleProvidersAction } from './RegModuleProvidersAction';
import { RegModuleRefAction } from './RegModuleRefAction';
import { RegModuleExportsAction } from './RegModuleExportsAction';

/**
 * annoation register scope.
 *
 * @export
 * @class AnnoationRegisterScope
 * @extends {IocCompositeAction<AnnoationContext>}
 */
export class AnnoationRegisterScope extends IocRegScope<DesignContext> implements IActionSetup {
    execute(ctx: DesignContext, next?: () => void): void {
        if (ctx.hasValue(CTX_MODULE_ANNOATION)) {
            super.execute(ctx, next);
        }
    }

    setup() {
        this.use(RegModuleImportsAction)
            .use(RegModuleProvidersAction)
            .use(RegModuleRefAction)
            .use(RegModuleExportsAction);
    }
}
