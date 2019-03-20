import { Singleton, IocCompositeAction, ProviderMap, Autorun } from '@ts-ioc/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { InitServiceResolveAction } from './InitServiceResolveAction';
import { ResovleServicesInTargetAction } from './ResovleServicesInTargetAction';
import { ResovleServicesInRaiseAction } from './ResovleServicesInRaiseAction';


@Singleton
@Autorun('setup')
export class ResolveServicesAction extends IocCompositeAction<ResolveServicesContext> {

    execute(ctx: ResolveServicesContext, next: () => void): void {
        if (ctx instanceof ResolveServicesContext) {
            ctx.services = ctx.resolve(ProviderMap);
            super.execute(ctx);
        } else {
            next();
        }
    }

    setup() {
        this.use(InitServiceResolveAction)
            .use(ResovleServicesInTargetAction)
            .use(ResovleServicesInRaiseAction);
    }
}
