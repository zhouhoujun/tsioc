import { IContainer, CONTAINER } from '@tsdi/core';
import { Inject, IocExt, Provider, InjectReference, DecoratorProvider } from '@tsdi/ioc';
import { BootContext } from '@tsdi/boot';
import { Suite } from './decorators';


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

        actInjector.getInstance(DecoratorProvider)
            .bindProviders(Suite,
                {
                    provide: BootContext,
                    deps: [CONTAINER],
                    useFactory: (container: IContainer, ...providers: Provider[]) => {
                        let ref = new InjectReference(BootContext, Suite.toString());
                        if (container.has(ref)) {
                            return container.get(ref, ...providers);
                        }
                        return null;
                    }
                });
    }
}
