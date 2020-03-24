import { RegContext } from './RegisterActionContext';
import { IocCompositeAction } from './IocCompositeAction';


/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 *
 */
export abstract class IocRegScope<T extends RegContext = RegContext> extends IocCompositeAction<T> {

}
