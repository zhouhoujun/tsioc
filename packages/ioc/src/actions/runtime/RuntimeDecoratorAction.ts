import { ExecDecoratorAtion } from '../ExecDecoratorAtion';
import { DecoratorRegisterer, RuntimeDecoratorRegisterer } from '../../services';

/**
 * runtime decorator action.
 *  the register type class can only, register to ioc.
 * ` container.registerSingleton(RouteRuntimRegisterAction, () => new RouteRuntimRegisterAction(container));`
 *
 * @export
 * @class RuntimeDecoratorAction
 * @extends {ExecDecoratorAtion}
 */
export class RuntimeDecoratorAction extends ExecDecoratorAtion {
    protected getRegisterer(): DecoratorRegisterer {
        return this.container.resolve(RuntimeDecoratorRegisterer);
    }
}
