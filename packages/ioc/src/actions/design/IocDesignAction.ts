import { IIocContainer } from '../../IIocContainer';
import { DesignActionContext } from './DesignActionContext';
import { IocRegisterAction } from '../IocRegisterAction';

/**
 * ioc design action.
 *
 * @export
 * @abstract
 * @class IocRegisterAction
 * @extends {IocRegisterAction<DesignActionContext>}
 */
export abstract class IocDesignAction extends IocRegisterAction<DesignActionContext> {
    constructor(container: IIocContainer) {
        super(container);
    }
}
