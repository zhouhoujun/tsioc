import { IocAction } from './Action';
import { RegisterActionContext } from './RegisterActionContext';
import { IIocContainer } from '../IIocContainer';

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
    constructor(protected container: IIocContainer) {
        super();
    }
}
