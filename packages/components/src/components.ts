import { Inject, IocExt } from '@tsdi/ioc';
import { IContainer, CONTAINER } from '@tsdi/core';
import { ResolveMoudleScope } from '@tsdi/boot';
import { ParseTemplateHandle } from './compile/actions';


/**
 * component extend module.
 *
 * @export
 * @class ComponentModule
 */
@IocExt()
export class ComponentsModule {

    setup(@Inject(CONTAINER) container: IContainer) {

        container.actionPdr.getInstance(ResolveMoudleScope)
            .use(ParseTemplateHandle);

    }

}
