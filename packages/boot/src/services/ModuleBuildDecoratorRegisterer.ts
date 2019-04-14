import { DecoratorRegisterer, Singleton } from '@tsdi/ioc';
import { BootContext } from '../BootContext';
import { HandleType } from '../core';

@Singleton
export class ModuleBuildDecoratorRegisterer extends DecoratorRegisterer<HandleType<BootContext>> {

}
