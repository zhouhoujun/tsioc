import { IocCompositeAction, Singleton } from '@ts-ioc/ioc';
import { ServiceResolveContext } from './ServiceResolveContext';


/**
 * service resolve component.
 *
 * @export
 * @class ResolveServiceAction
 * @extends {IocCompositeAction<ServiceResolveContext>}
 */
@Singleton
export class ResolveServiceAction extends IocCompositeAction<ServiceResolveContext> {
    execute(ctx: ServiceResolveContext, next?: () => void): void {
        if (ctx instanceof ServiceResolveContext) {
            super.execute(ctx, next);
        } else {
            next();
        }
    }
}
