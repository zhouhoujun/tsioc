import { IocASyncDecoratorRegisterer } from '../../core';
import { Singleton } from '@tsdi/ioc';
import { ParseHandle } from './ParseHandle';

@Singleton
export class SelectorDecoratorRegisterer extends IocASyncDecoratorRegisterer<ParseHandle> {

}
