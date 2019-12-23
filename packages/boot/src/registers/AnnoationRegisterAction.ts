import { IocRegisterScope, DesignActionContext, IActionSetup } from '@tsdi/ioc';
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
export class AnnoationRegisterAction extends IocRegisterScope<DesignActionContext> implements IActionSetup {
    execute(ctx: DesignActionContext, next?: () => void): void {
        if (ctx.has(CTX_MODULE_ANNOATION)) {
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
