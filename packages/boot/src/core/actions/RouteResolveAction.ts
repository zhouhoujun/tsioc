import { IocCompositeAction, ResovleActionContext, Singleton } from '@ts-ioc/ioc';
import { ContainerPoolToken } from '../ContainerPool';

@Singleton
export class RouteResolveAction extends IocCompositeAction<ResovleActionContext> {

    execute(ctx: ResovleActionContext, next?: () => void): void {
        if (ctx.getRaiseContainer().has(ContainerPoolToken)) {
            super.execute(ctx, next);
        } else {
            next();
        }
    }
}
