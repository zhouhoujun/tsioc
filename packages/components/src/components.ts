import { Inject, IocExt, IContainer, CONTAINER } from '@tsdi/ioc';
import { HostMappingRoot } from './router';


/**
 * component extend module.
 *
 * @export
 * @class ComponentModule
 */
@IocExt()
export class ComponentsModule {

    setup(@Inject(CONTAINER) container: IContainer) {

        container.register(HostMappingRoot);

        // prdr.regAction(
        //         RenderView,
        //         RefreshView,
        //         RenderComponent
        //     );



    }

}
