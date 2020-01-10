import { IocRaiseContext } from './IocAction';
import { IocCompositeAction } from './IocCompositeAction';


/**
 * action scope.
 *
 * @export
 * @abstract
 * @class ActionScope
 * @extends {IocCompositeAction<T>}
 * @template T
 */
export abstract class ActionScope<T extends IocRaiseContext> extends IocCompositeAction<T> {

}
