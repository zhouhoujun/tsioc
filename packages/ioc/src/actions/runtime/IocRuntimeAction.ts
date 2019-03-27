import { RuntimeActionContext } from './RuntimeActionContext';
import { IocRegisterAction } from '../IocRegisterAction';

/**
 * ioc register action.
 *
 * @export
 * @abstract
 * @class IocRegisterAction
 * @extends {IocRegisterAction<RuntimeActionContext>}
 */
export abstract class IocRuntimeAction extends IocRegisterAction<RuntimeActionContext> {

}

