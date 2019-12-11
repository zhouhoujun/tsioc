import { ExecDecoratorAtion } from '../ExecDecoratorAtion';
import { DecoratorsRegisterer, RuntimeRegisterer } from '../DecoratorsRegisterer';

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
    protected getScopeRegisterer(): DecoratorsRegisterer {
        return this.actInjector.getInstance(RuntimeRegisterer);
    }
}
