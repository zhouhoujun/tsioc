import { IocASyncDecoratorRegisterer } from '../../core';
import { Type, Singleton } from '@tsdi/ioc';
import { ParseHandle } from './ParseHandle';

@Singleton
export class BindingScopeDecoratorRegisterer extends IocASyncDecoratorRegisterer<Type<ParseHandle>> {

}
