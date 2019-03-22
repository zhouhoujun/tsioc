import { RuntimeActionContext } from './RuntimeActionContext';
import { IIocContainer } from '../../IIocContainer';
import { IocRegisterAction } from '../IocRegisterAction';
import { IocCompositeAction } from '../IocCompositeAction';

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

/**
 * ioc composite runtime action.
 *
 * @export
 * @abstract
 * @class IocRuntimeScopeAction
 * @extends {IocCompositeAction<RuntimeActionContext>}
 */
export abstract class IocRuntimeScopeAction extends IocCompositeAction<RuntimeActionContext> {
    constructor(protected container: IIocContainer) {
        super();
    }
}
