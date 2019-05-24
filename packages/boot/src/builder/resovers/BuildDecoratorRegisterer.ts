import { Singleton, Type } from '@tsdi/ioc';
import { IocBuildDecoratorRegisterer } from '../../core';
import { ResolveHandle } from './ResolveHandle';

@Singleton
export class BuildDecoratorRegisterer extends IocBuildDecoratorRegisterer<Type<ResolveHandle>> {

}
