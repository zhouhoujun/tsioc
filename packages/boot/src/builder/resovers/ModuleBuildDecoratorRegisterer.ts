import { Singleton } from '@tsdi/ioc';
import { HandleType, IocASyncDecoratorRegisterer } from '../../core';
import { BuildContext } from './BuildContext';

@Singleton
export class ModuleBuildDecoratorRegisterer extends IocASyncDecoratorRegisterer<HandleType<BuildContext>> {

}
