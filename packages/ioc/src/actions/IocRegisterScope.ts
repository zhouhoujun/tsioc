import { IocCompositeAction } from './IocCompositeAction';
import { RegisterActionContext } from './RegisterActionContext';
import { IIocContainer } from '../IIocContainer';

/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 *
 * @export
 * @abstract
 * @class IocRegisterScope
 * @extends {IocCompositeAction<T>}
 * @template T
 */
export abstract class IocRegisterScope<T extends RegisterActionContext> extends IocCompositeAction<T> {
    abstract setup(container: IIocContainer);
}
