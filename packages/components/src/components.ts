import { Inject, IocExt, IContainer, CONTAINER } from '@tsdi/ioc';
import { ResolveScope } from '@tsdi/boot';
import { ParseTemplateHandle } from './compile/actions';
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

        container.action()
            .getInstance(ResolveScope)
            .use(ParseTemplateHandle);

    }

}
