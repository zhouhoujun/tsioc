import { IContainer, ContainerToken, IocExt } from '@tsdi/core';
import { Suite } from './decorators/Suite';
import {
    Inject, DecoratorScopes, RegisterSingletionAction, ProviderTypes, InjectReference,
    DesignRegisterer, RuntimeRegisterer, DecoratorProvider
} from '@tsdi/ioc';
import { BootContext, AnnoationDesignAction } from '@tsdi/boot';


/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BootModule
 */
@IocExt('setup')
export class UnitSetup {

    constructor() {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(ContainerToken) container: IContainer) {

        container.getInstance(DesignRegisterer)
            .register(Suite, DecoratorScopes.Class, AnnoationDesignAction);

        container.getInstance(RuntimeRegisterer)
            .register(Suite, DecoratorScopes.Class, RegisterSingletionAction);

        container.getInstance(DecoratorProvider)
            .bindProviders(Suite,
                {
                    provide: BootContext,
                    deps: [ContainerToken],
                    useFactory: (container: IContainer, ...providers: ProviderTypes[]) => {
                        let ref = new InjectReference(BootContext, Suite.toString());
                        if (container.has(ref)) {
                            return container.get(ref, ...providers);
                        }
                        return null;
                    }
                });
    }
}
