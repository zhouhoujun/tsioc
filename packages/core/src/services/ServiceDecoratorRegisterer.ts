import { DecoratorRegisterer, Singleton, Type } from '@tsdi/ioc';
import { IocResolveServiceAction } from '../resolves';

@Singleton
export class ServiceDecoratorRegisterer extends DecoratorRegisterer<Type<IocResolveServiceAction>> {

}
