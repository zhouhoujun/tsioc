import { DecoratorRegisterer, PromiseUtil } from '@tsdi/ioc';
import { IHandle } from './Handle';


export class IocBuildDecoratorRegisterer<T extends IHandle = IHandle> extends DecoratorRegisterer<PromiseUtil.ActionHandle> {

}
