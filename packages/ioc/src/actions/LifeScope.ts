import { IocRaiseContext } from './IocAction';
import { ActionScope } from './ActionScope';


/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocCompositeAction<T>}
 */
export class LifeScope<T extends IocRaiseContext> extends ActionScope<T> {

}
