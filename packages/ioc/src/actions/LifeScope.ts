import { IocContext } from './IocActionContext';
import { IocCompositeAction } from './IocCompositeAction';


/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocCompositeAction<T>}
 */
export class LifeScope<T extends IocContext> extends IocCompositeAction<T> {

}
