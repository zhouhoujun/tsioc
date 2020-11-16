import { Inject, IocExt } from '@tsdi/ioc';
import { IContainer, CONTAINER } from '@tsdi/core';
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

        prdr.regAction(RenderView)
            .regAction(RefreshView)
            .regAction(RenderComponent);

        prdr.getInstance(ResolveMoudleScope)
            .use(ParseTemplateHandle);

    }

}
