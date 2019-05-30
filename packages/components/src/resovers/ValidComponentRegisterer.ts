import { IocBuildDecoratorRegisterer, BuildHandle } from '../../core';
import { Type, Singleton } from '@tsdi/ioc';
import { BuildContext } from './BuildContext';

@Singleton()
export class ValidComponentRegisterer extends IocBuildDecoratorRegisterer<Type<BuildHandle<BuildContext>>> {

}

