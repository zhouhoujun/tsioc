import { Singleton, IocCompositeAction, Autorun } from '@ts-ioc/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { ResovleServicesInTargetAction } from './ResovleServicesInTargetAction';
import { ResovleServicesInRaiseAction } from './ResovleServicesInRaiseAction';
import { ResovleServicesRefsAction } from './ResovleServicesRefsAction';


@Singleton
@Autorun('setup')
export class ResolveServicesScopeAction extends IocCompositeAction<ResolveServicesContext> {

    setup() {
        this.use(ResovleServicesInTargetAction)
            .use(ResovleServicesRefsAction)
            .use(ResovleServicesInRaiseAction);
    }
}
