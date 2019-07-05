import { DecoratorRegisterer, IIocContainer, isFunction, isClass, PromiseUtil } from '@tsdi/ioc';
import { BuildHandle, BuildHandleRegisterer } from './BuildHandles';


export class IocBuildDecoratorRegisterer<T> extends DecoratorRegisterer<T, PromiseUtil.ActionHandle> {

    toFunc(container: IIocContainer, ac: T): PromiseUtil.ActionHandle {
        if (isClass(ac)) {
            let action = container.get(BuildHandleRegisterer).get(ac);
            return action instanceof BuildHandle ? action.toAction() : null;

        } else if (ac instanceof BuildHandle) {
            return ac.toAction();
        }
        return isFunction(ac) ? <any>ac : null;
    }
}
