import { IocAction } from './IocAction';
import { ResolveContext } from './ResolveContext';

/**
 * ioc Resolve action.
 *
 * the Resolve type class can only Resolve in ioc as:
 * ` container.ResolveSingleton(SubResolveAction, () => new SubResolveAction(container));`
 * @export
 * @abstract
 * @class IocResolveAction
 * @extends {IocAction<T>}
 * @template T
 */
export abstract class IocResolveAction<T extends ResolveContext = ResolveContext> extends IocAction<T> {

}
