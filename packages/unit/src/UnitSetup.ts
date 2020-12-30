import {
    Inject, IocExt, RegSingletionAction, ProviderType, InjectReference,
    DesignRegisterer, RuntimeRegisterer, DecoratorProvider, IContainer, CONTAINER
} from '@tsdi/ioc';
import { Suite } from './decorators';
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
    setup(@Inject(CONTAINER) container: IContainer) {

        let actInjector = container.getActionInjector();
        actInjector.getInstance(DesignRegisterer)
            .register(Suite, 'Class', AnnoationAction);

        actInjector.getInstance(RuntimeRegisterer)
            .register(Suite, 'Class', RegSingletionAction);

        actInjector.getInstance(DecoratorProvider)
            .bindProviders(Suite,
                {
                    provide: BootContext,
                    deps: [CONTAINER],
                    useFactory: (container: IContainer, ...providers: ProviderType[]) => {
                        let ref = new InjectReference(BootContext, Suite.toString());
                        if (container.has(ref)) {
                            return container.get(ref, ...providers);
                        }
                        return null;
                    }
                });
    }
}
