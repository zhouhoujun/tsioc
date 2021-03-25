import { Inject, IocExt, IContainer, CONTAINER } from '@tsdi/ioc';
import { ResolveMoudleScope } from '@tsdi/boot';
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

        const prdr = container.provider;
        container.register(HostMappingRoot);

        // prdr.regAction(
        //         RenderView,
        //         RefreshView,
        //         RenderComponent
        //     );

        prdr.getInstance(ResolveMoudleScope)
            .use(ParseTemplateHandle);

    }

}
