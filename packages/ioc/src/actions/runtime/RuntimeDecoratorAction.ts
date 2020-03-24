import { ExecDecoratorAtion } from '../ExecDecoratorAtion';
import { DecorsRegisterer, RuntimeRegisterer } from '../DecoratorsRegisterer';

/**
 * runtime decorator action.
 *  the register type class can only, register to ioc.
 * ` container.registerSingleton(RouteRuntimRegisterAction, () => new RouteRuntimRegisterAction(container));`
 *
 * @export
 * @class RuntimeDecoratorAction
 * @extends {ExecDecoratorAtion}
 */
export class RuntimeDecorAction extends ExecDecoratorAtion {
    protected getScopeRegisterer(): DecorsRegisterer {
        return this.actInjector.getInstance(RuntimeRegisterer);
    }
}
