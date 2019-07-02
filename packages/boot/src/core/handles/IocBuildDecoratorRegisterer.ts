import { DecoratorRegisterer, IIocContainer, isFunction, isClass, PromiseUtil } from '@tsdi/ioc';
import { BuildHandle, BuildHandleRegisterer } from './BuildHandles';


export class IocBuildDecoratorRegisterer<T> extends DecoratorRegisterer<T> {

    getFuncs(container: IIocContainer, decorator: string | Function): PromiseUtil.ActionHandle[] {
        return super.getFuncs(container, decorator) as PromiseUtil.ActionHandle[];
    }

    toFunc(container: IIocContainer, ac: T): Function {
        if (isClass(ac)) {
            let action = container.get(BuildHandleRegisterer).get(ac);
            return action instanceof BuildHandle ? action.toAction() : null;

        } else if (ac instanceof BuildHandle) {
            return ac.toAction();
        }
        return isFunction(ac) ? ac : null;
    }
}
