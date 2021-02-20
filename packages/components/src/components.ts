import { Inject, IocExt, IContainer, CONTAINER } from '@tsdi/ioc';
import { ResolveMoudleScope } from '@tsdi/boot';
import { ParseTemplateHandle } from './compile/actions';
import { RefreshView, RenderComponent, RenderView } from './vnode/actions/render';


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

        prdr.regAction(
                RenderView,
                RefreshView,
                RenderComponent
            );

        prdr.getInstance(ResolveMoudleScope)
            .use(ParseTemplateHandle);

    }

}
