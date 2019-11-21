import { IocCompositeAction, lang } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { AnnoationContext } from '../AnnoationContext';
import { ContainerPoolToken } from '../ContainerPoolToken';
import { RegFor } from '../modules';
import { RegModuleAction } from './RegModuleAction';
import { RegModuleImportsAction } from './RegModuleImportsAction';
import { RegModuleProvidersAction } from './RegModuleProvidersAction';
import { RegModuleResolverAction } from './RegModuleResolverAction';

/**
 * annoation register scope.
 *
 * @export
 * @class AnnoationRegisterScope
 * @extends {IocCompositeAction<AnnoationContext>}
 */
export class AnnoationRegisterScope extends IocCompositeAction<AnnoationContext> {
    execute(ctx: AnnoationContext, next?: () => void): void {
        let pools = this.container.get(ContainerPoolToken);

        if (ctx.regFor === RegFor.boot) {
            return super.execute(ctx, next);
        }

        let container = ctx.getRaiseContainer();
        let moduleContainer: IContainer;
        switch (ctx.regFor) {
            case RegFor.root:
                moduleContainer = pools.getRoot();
                break;
            case RegFor.child:
                moduleContainer = pools.create(container);
                break;
        }
        if (moduleContainer) {
            ctx.setRaiseContainer(moduleContainer);
        }

        return super.execute(ctx, next);

    }

    setup() {
        this.use(RegModuleAction)
            .use(RegModuleImportsAction)
            .use(RegModuleProvidersAction)
            .use(RegModuleResolverAction);
    }
}
