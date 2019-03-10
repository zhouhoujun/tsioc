import { IocAction } from './Action';
import { ResovleContext } from './ResovleContext';

/**
 * ioc resolve action.
 *
 * @export
 * @abstract
 * @class IocResolveAction
 * @extends {IocAction<IResovleContext>}
 */
export abstract class IocResolveAction extends IocAction<ResovleContext> {
    isResolve = true;
}
