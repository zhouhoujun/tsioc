import { IContainer, ContainerToken } from '@tsdi/core';
import { Suite } from './decorators';
import {
    Inject, IocExt, RegSingletionAction, ProviderTypes, InjectReference,
    DesignRegisterer, RuntimeRegisterer, DecoratorProvider
} from '@tsdi/ioc';
import { BootContext, AnnoationAction } from '@tsdi/boot';


/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BootModule
 */
@IocExt()
export class UnitSetup {

    constructor() {

    }

    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup(@Inject(ContainerToken) container: IContainer) {

        let actInjector = container.getActionInjector();
        actInjector.getInstance(DesignRegisterer)
            .register(Suite, 'Class', AnnoationAction);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Suite, 'Class', RegSingletionAction);

        actInjector.getInstance(DecoratorProvider)
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
