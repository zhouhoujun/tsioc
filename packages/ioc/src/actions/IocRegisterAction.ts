import { IocAction } from './Action';
import { RegisterActionContext } from './RegisterActionContext';
import { IIocContainer } from '../IIocContainer';

/**
 * ioc register action.
 *
 * @export
 * @abstract
 * @class IocRegisterAction
 * @extends {IocAction<RegisterActionContext>}
 */
export abstract class IocRegisterAction extends IocAction<RegisterActionContext> {
    constructor(protected container: IIocContainer) {
        super();
    }
}
