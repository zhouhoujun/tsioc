import { Inject, IocExt, Injector, ROOT_INJECTOR } from '@tsdi/ioc';
import { ComponentFactoryResolver } from './refs/component';
import { HostMappingRoot } from './router';


/**
 * component extend module.
 *
 * @export
 * @class ComponentModule
 */
@IocExt()
export class ComponentsModule {

    setup(@Inject(ROOT_INJECTOR) injector: Injector) {
        injector.register(HostMappingRoot);
        injector.setValue(ComponentFactoryResolver,  );
    }

}
