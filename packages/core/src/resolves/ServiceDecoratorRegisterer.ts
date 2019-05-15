import { Singleton, Type, IocSyncDecoratorRegisterer } from '@tsdi/ioc';
import { IocResolveServiceAction } from '../resolves';

@Singleton
export class ServiceDecoratorRegisterer extends IocSyncDecoratorRegisterer<Type<IocResolveServiceAction>> {

}
