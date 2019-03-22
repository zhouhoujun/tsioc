import { RuntimeActionContext } from './RuntimeActionContext';
import { IIocContainer } from '../../IIocContainer';
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
    constructor(container: IIocContainer) {
        super(container);
    }
}
