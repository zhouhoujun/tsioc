import { IocActionContext } from './Action';
import { IocCompositeAction } from './IocCompositeAction';


/**
 * register Type init life scope action.
 *
 * @export
 * @class LifeScope
 * @extends {IocCompositeAction<T>}
 */
export class LifeScope<T extends IocActionContext> extends IocCompositeAction<T> {

}
