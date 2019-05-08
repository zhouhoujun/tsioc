import { IocASyncDecoratorRegisterer } from '../../core';
import { Singleton, Type } from '@tsdi/ioc';
import { ParseHandle } from './ParseHandle';

@Singleton
export class SelectorDecoratorRegisterer extends IocASyncDecoratorRegisterer<Type<ParseHandle>> {

}
