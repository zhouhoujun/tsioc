import { DecoratorRegisterer, Singleton } from '@tsdi/ioc';
import { HandleType } from '../../core';
import { BuildContext } from './BuildContext';

@Singleton
export class ModuleBuildDecoratorRegisterer extends DecoratorRegisterer<HandleType<BuildContext>> {

}
