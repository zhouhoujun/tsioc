import { IocBuildDecoratorRegisterer, BuildHandle, BuildContext } from '@tsdi/boot';
import { Type, Singleton } from '@tsdi/ioc';


@Singleton()
export class ValidComponentRegisterer extends IocBuildDecoratorRegisterer<Type<BuildHandle<BuildContext>>> {

}

