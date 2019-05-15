import { IocASyncDecoratorRegisterer, Handle } from '../../core';
import { Type, Singleton } from '@tsdi/ioc';
import { BuildContext } from './BuildContext';

@Singleton()
export class BindingComponentDecoratorRegisterer extends IocASyncDecoratorRegisterer<Type<Handle<BuildContext>>> {

}
