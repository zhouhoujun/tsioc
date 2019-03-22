import { ResolveServicesContext } from '@ts-ioc/core';
import { IocCompositeAction, Singleton, Autorun, IocActionType } from '@ts-ioc/ioc';
import { ResolveSerivesInExportAction } from './ResolveSerivesInExportAction';
import { ResolveParentServicesAction } from './ResolveParentServicesAction';


@Singleton
@Autorun('setup')
export class ResolveRouteServicesAction extends IocCompositeAction<ResolveServicesContext>  {
    execute(ctx: ResolveServicesContext, next?: () => void, filter?: (action: IocActionType) => boolean): void {
        let token = ctx.token;
        ctx.token = ctx.currToken || ctx.token;
        let donext = () => {
            ctx.token = token;
            next && next();
        }
        super.execute(ctx, donext, filter);
    }

    setup() {
        this.use(ResolveSerivesInExportAction)
            .use(ResolveParentServicesAction);
    }
}
