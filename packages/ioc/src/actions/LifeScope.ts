import { IocRaiseContext } from './IocAction';
import { IocCompositeAction } from './IocCompositeAction';


/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocCompositeAction<T>}
 */
export class LifeScope<T extends IocRaiseContext> extends IocCompositeAction<T> {

}
