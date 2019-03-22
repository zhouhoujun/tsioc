import { IocActionContext, IocAction, RegisterActionContext, ResovleActionContext } from '@ts-ioc/ioc';
import { IContainer } from '../../IContainer';


/**
 * global action.
 *
 * @export
 * @abstract
 * @class IocGlobalAction
 * @extends {IocAction<T>}
 * @template T
 */
export abstract class IocGlobalAction<T extends IocActionContext> extends IocAction<T> {
}


/**
 * global register action.
 *
 * @export
 * @abstract
 * @class GlobalRegisterAction
 * @extends {IocGlobalAction<RegisterActionContext>}
 */
export abstract class GlobalRegisterAction extends IocGlobalAction<RegisterActionContext> {
    constructor(protected container: IContainer) {
        super();
    }
}


/**
 * global resolve action.
 *
 * @export
 * @abstract
 * @class GlobalResolveAction
 * @extends {IocGlobalAction<ResovleActionContext>}
 */
export abstract class GlobalResolveAction extends IocGlobalAction<ResovleActionContext> {
}
