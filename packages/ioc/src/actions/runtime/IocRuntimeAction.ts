import { RuntimeContext } from './RuntimeActionContext';
import { IocRegAction } from '../IocRegisterAction';

/**
 * ioc runtime register action.
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubRuntimRegisterAction, () => new SubRuntimRegisterAction(container));`
 * @export
 * @abstract
 * @class IocRegisterAction
 * @extends {IocRegAction<RuntimeContext>}
 */
export abstract class IocRuntimeAction extends IocRegAction<RuntimeContext> {

}

