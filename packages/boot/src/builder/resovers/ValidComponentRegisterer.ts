import { IocASyncDecoratorRegisterer, Handle } from '../../core';
import { Type, Singleton } from '@tsdi/ioc';
import { BuildContext } from './BuildContext';

@Singleton()
export class ValidComponentRegisterer extends IocASyncDecoratorRegisterer<Type<Handle<BuildContext>>> {

}

