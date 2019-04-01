import { IocCompositeAction } from './IocCompositeAction';
import { ResolveActionContext } from './ResolveActionContext';
import { IocDefaultResolveAction } from './resolves/IocDefaultResolveAction';


/**
 * register action scope.
 *  the register type class can only register in ioc as:
 * ` container.registerSingleton(SubResolveAction, () => new SubResolveAction(container));`
 *
 * @export
 * @abstract
 * @class IocResolveScope
 * @extends {IocCompositeAction<T>}
 * @template T
 */
export class IocResolveScope extends IocCompositeAction<ResolveActionContext<any>> {

    setup() {
        this.registerAction(IocDefaultResolveAction);
        this.use(IocDefaultResolveAction);
    }
}
