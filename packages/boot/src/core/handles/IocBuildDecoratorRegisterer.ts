import { DecoratorRegisterer, IIocContainer, isFunction, isClass, PromiseUtil, DecoratorScopeRegisterer } from '@tsdi/ioc';
import { BuildHandle, HandleRegisterer } from './BuildHandles';
import { IHandle } from './Handle';


export class IocBuildDecoratorRegisterer<T extends IHandle> extends DecoratorRegisterer<T, PromiseUtil.ActionHandle> {

    toFunc(container: IIocContainer, ac: T): PromiseUtil.ActionHandle {
        if (isClass(ac)) {
            let action = container.get(HandleRegisterer).get(ac);
            return action instanceof BuildHandle ? action.toAction() : null;

        } else if (ac instanceof BuildHandle) {
            return ac.toAction();
        }
        return isFunction(ac) ? <any>ac : null;
    }
}

export enum StartupScopes {
    Build = 'Build',
    BindExpression = 'BindExpression',
    Element = 'Element',
    Binding =  'Binding',
    ValidComponent = 'ValidComponent'
}

/**
 * register application startup build process of decorator.
 *
 * @export
 * @class StartupDecoratorRegisterer
 * @extends {DecoratorScopeRegisterer<T, PromiseUtil.ActionHandle>}
 * @template T
 */
export class StartupDecoratorRegisterer<T extends IHandle = IHandle> extends DecoratorScopeRegisterer<T, PromiseUtil.ActionHandle> {

    protected createRegister(): IocBuildDecoratorRegisterer<T> {
        return new IocBuildDecoratorRegisterer();
    }
}
