import { IContainer, InjectorDecoratorRegisterer, IocExt, ContainerToken } from '@tsdi/core';
import {
    BindProviderAction, IocSetCacheAction, DesignDecoratorRegisterer,
    RuntimeDecoratorRegisterer, DecoratorScopes, RegisterSingletionAction, Inject
} from '@tsdi/ioc';
import { BuilderService } from './builder';


@IocExt('setup')
export class ComponentsModule {

    setup(@Inject(ContainerToken) container: IContainer) {

        container.register(BuilderService);
        container.use(annotations, runnable, services);

        container.get(DesignDecoratorRegisterer)
            .register(Bootstrap, DecoratorScopes.Class, BindProviderAction);

        container.get(RuntimeDecoratorRegisterer)
            .register(Bootstrap, DecoratorScopes.Class, RegisterSingletionAction, IocSetCacheAction);

        container.get(InjectorDecoratorRegisterer)
            .register(Bootstrap, DIModuleInjectorScope);
    }

}
