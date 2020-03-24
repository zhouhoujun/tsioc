import { IocAction } from './IocAction';
import { RegContext } from './RegisterActionContext';

/**
 * ioc register action.
 *
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRegisterAction, () => new SubRegisterAction(container));`
 */
export abstract class IocRegAction<T extends RegContext> extends IocAction<T> {

}
