import { RegisterActionContext } from './RegisterActionContext';
import { IocCompositeAction } from './IocCompositeAction';


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
export abstract class IocRegisterScope<T extends RegisterActionContext = RegisterActionContext> extends IocCompositeAction<T> {

}
