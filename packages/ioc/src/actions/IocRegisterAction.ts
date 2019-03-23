import { IocAction } from './Action';
import { RegisterActionContext } from './RegisterActionContext';

/**
 * ioc register action.
 *
 * @export
 * @abstract
 * @class IocRegisterAction
 * @extends {IocAction<T>}
 * @template T
 */
export abstract class IocRegisterAction<T extends RegisterActionContext> extends IocAction<T> {

}
