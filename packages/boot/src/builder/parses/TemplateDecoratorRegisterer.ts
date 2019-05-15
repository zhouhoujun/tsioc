import { IocASyncDecoratorRegisterer } from '../../core';
import { Singleton, Type } from '@tsdi/ioc';
import { ParseHandle } from './ParseHandle';

@Singleton
export class TemplateDecoratorRegisterer extends IocASyncDecoratorRegisterer<Type<ParseHandle>> {

}
