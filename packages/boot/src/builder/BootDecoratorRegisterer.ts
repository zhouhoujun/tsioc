import { Type, Singleton } from '@tsdi/ioc';
import { IocASyncDecoratorRegisterer } from '../core';
import { BootHandle } from './BootHandle';

@Singleton
export class BootDecoratorRegisterer extends IocASyncDecoratorRegisterer<Type<BootHandle>> {

}
