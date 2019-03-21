import { IocActionContext, IocAction } from './Action';
import { RegisterActionContext } from './RegisterActionContext';
import { ResovleActionContext } from './ResovleActionContext';
import { IIocContainer } from '../IIocContainer';

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
    constructor(protected container: IIocContainer) {
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
