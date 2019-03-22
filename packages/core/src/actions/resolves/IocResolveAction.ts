import { IocAction } from '@ts-ioc/ioc';
import { ResovleActionContext } from './ResovleActionContext';

/**
 * ioc resolve action.
 *
 * @export
 * @abstract
 * @class IocResolveAction
 * @extends {IocAction<IResovleContext>}
 */
export abstract class IocResolveAction extends IocAction<ResovleActionContext> {
    isResolve = true;
}
