import { IocResolveAction } from '@ts-ioc/ioc';
import { ServiceResolveContext } from './ServiceResolveContext';

/**
 * resolve service base action.
 *
 * @export
 * @abstract
 * @class IocResolveServiceAction
 * @extends {IocResolveAction}
 */
export abstract class IocResolveServiceAction extends IocResolveAction {
    abstract execute(ctx: ServiceResolveContext, next: () => void): void;
}
