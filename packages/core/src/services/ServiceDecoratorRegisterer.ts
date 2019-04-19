import { DecoratorRegisterer, Singleton } from '@tsdi/ioc';
import { IocResolveServiceAction } from '../resolves';

@Singleton
export class ServiceDecoratorRegisterer extends DecoratorRegisterer<IocResolveServiceAction> {

}
