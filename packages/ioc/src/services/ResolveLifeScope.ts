import { LifeScope } from './LifeScope';
import { IIocContainer } from '../IIocContainer';
import { ResovleActionContext, IocAction, IocDefaultResolveAction } from '../actions';
import { Type } from '../types';

/**
 * resolve life scope.
 *
 * @export
 * @class ResolveLifeScope
 * @extends {LifeScope<IResovleContext>}
 */
export class ResolveLifeScope extends LifeScope<ResovleActionContext> {

    registerDefault(container: IIocContainer) {
        if (!container.has(ResolveLifeScope)) {
            container.bindProvider(ResolveLifeScope, this);
        }
        container.registerSingleton(IocDefaultResolveAction, () => new IocDefaultResolveAction());
        this.use(IocDefaultResolveAction);
    }

    protected resolveAction(ctx: ResovleActionContext, ac: Type<IocAction<any>>) {
        return ctx.resolve(ac, ...ctx.providers);
    }
}
