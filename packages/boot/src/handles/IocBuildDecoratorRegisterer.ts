import { DecorRegisterer, AsyncHandler } from '@tsdi/ioc';
import { IHandle } from './Handle';


export class IocBuildDecoratorRegisterer<T extends IHandle = IHandle> extends DecorRegisterer<AsyncHandler> {

}
