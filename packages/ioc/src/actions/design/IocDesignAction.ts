import { DesignContext } from './DesignActionContext';
import { IocRegAction } from '../IocRegisterAction';

/**
 * ioc design action.
 * the register type class can only register in ioc as:
 * ` container.registerSingleton(SubDesignRegisterAction, () => new SubDesignRegisterAction(container));`
 * @export
 * @abstract
 * @class IocRegisterAction
 * @extends {IocRegAction<DesignContext>}
 */
export abstract class IocDesignAction extends IocRegAction<DesignContext> {

}
