import { LifeScope } from './LifeScope';
import { IIocContainer } from '../IIocContainer';
import { IocAction, IocDefaultResolveAction } from '../actions';
import { Type } from '../types';
import { ResovleContext } from '../ResovleContext';

/**
 * resolve life scope.
 *
 * @export
 * @class ResolveLifeScope
 * @extends {LifeScope<IResovleContext>}
 */
export class ResolveLifeScope extends LifeScope<ResovleContext> {

    registerDefault(container: IIocContainer) {
        if (!container.has(ResolveLifeScope)) {
            container.bindProvider(ResolveLifeScope, this);
        }
        container.registerSingleton(IocDefaultResolveAction, () => new IocDefaultResolveAction(container));
        this.use(IocDefaultResolveAction);
    }

    protected resolveAction(container: IIocContainer, ctx: ResovleContext, ac: Type<IocAction<any>>) {
        return ctx.get(ac, ...ctx.providers);
    }
}
