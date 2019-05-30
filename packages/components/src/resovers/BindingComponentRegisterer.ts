import { IocBuildDecoratorRegisterer, BuildContext, BuildHandle } from '@tsdi/boot';
import { Type, Singleton } from '@tsdi/ioc';

@Singleton()
export class BindingComponentRegisterer extends IocBuildDecoratorRegisterer<Type<BuildHandle<BuildContext>>> {

}
