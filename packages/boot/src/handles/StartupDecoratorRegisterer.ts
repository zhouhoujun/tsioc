import { IHandle } from './Handle';
import { DecorsRegisterer, AsyncHandler } from '@tsdi/ioc';
import { IocBuildDecoratorRegisterer } from './IocBuildDecoratorRegisterer';


/**
 * register application startup build process of decorator.
 *
 * @export
 * @class StartupDecoratorRegisterer
 * @extends {DecorsRegisterer<T, AsyncHandler>}
 * @template T
 */
export class StartupDecoratorRegisterer<T extends IHandle = IHandle> extends DecorsRegisterer<AsyncHandler> {

    protected createRegister(): IocBuildDecoratorRegisterer {
        return new IocBuildDecoratorRegisterer();
    }
}
