import { IocCompositeAction, Singleton } from '@ts-ioc/ioc';
import { ResolveServiceContext } from './ResolveServiceContext';


/**
 * service resolve component.
 *
 * @export
 * @class ResolveServiceAction
 * @extends {IocCompositeAction<ResolveServiceContext>}
 */
@Singleton
export class ResolveServiceAction extends IocCompositeAction<ResolveServiceContext> {
    execute(ctx: ResolveServiceContext, next?: () => void): void {
        if (ctx instanceof ResolveServiceContext) {
            super.execute(ctx);
        } else {
            next();
        }
    }
}
