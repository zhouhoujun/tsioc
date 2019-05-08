import { Singleton, Type } from '@tsdi/ioc';
import { IocASyncDecoratorRegisterer } from '../../core';
import { ResolveHandle } from './ResolveHandle';

@Singleton
export class ModuleBuildDecoratorRegisterer extends IocASyncDecoratorRegisterer<Type<ResolveHandle>> {

}
