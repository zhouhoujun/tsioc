import { DecoratorRegisterer, IIocContainer, isFunction, isClass, PromiseUtil } from '@tsdi/ioc';
import { Handle } from './Handle';


export class IocASyncDecoratorRegisterer<T> extends DecoratorRegisterer<T> {

    getFuncs(container: IIocContainer, decorator: string | Function): PromiseUtil.ActionHandle<any>[] {
        return super.getFuncs(container, decorator) as PromiseUtil.ActionHandle<any>[];
    }

    toFunc(container: IIocContainer, ac: T): Function {
        if (isClass(ac)) {
            let action = container.get(ac);
            return action instanceof Handle ?
                (ctx: T, next?: () => Promise<void>) => action.execute(ctx, next)
                : null

        } else if (ac instanceof Handle) {
            return (ctx: T, next?: () => Promise<void>) => ac.execute(ctx, next);
        }
        return isFunction(ac) ? ac : null;
    }
}
