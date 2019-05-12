import { DecoratorRegisterer, IIocContainer, isFunction, isClass, PromiseUtil } from '@tsdi/ioc';
import { Handle } from './Handle';
import { HandleRegisterer } from './CompositeHandle';


export class IocASyncDecoratorRegisterer<T> extends DecoratorRegisterer<T> {

    getFuncs(container: IIocContainer, decorator: string | Function): PromiseUtil.ActionHandle<any>[] {
        return super.getFuncs(container, decorator) as PromiseUtil.ActionHandle<any>[];
    }

    toFunc(container: IIocContainer, ac: T): Function {
        if (isClass(ac)) {
            let action = container.get(HandleRegisterer).get(ac);
            return action instanceof Handle ? action.toAction() : null;

        } else if (ac instanceof Handle) {
            return ac.toAction();
        }
        return isFunction(ac) ? ac : null;
    }
}
