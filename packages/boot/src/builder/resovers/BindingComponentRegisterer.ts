import { IocBuildDecoratorRegisterer, Handle } from '../../core';
import { Type, Singleton } from '@tsdi/ioc';
import { BuildContext } from './BuildContext';

@Singleton()
export class BindingComponentRegisterer extends IocBuildDecoratorRegisterer<Type<Handle<BuildContext>>> {

}
