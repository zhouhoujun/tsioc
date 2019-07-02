import { IocResolveScope } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { ResovleServicesInTargetAction } from './ResovleServicesInTargetAction';
import { ResovleServicesInRaiseAction } from './ResovleServicesInRaiseAction';
import { ResovleServicesRefsAction } from './ResovleServicesRefsAction';



export class ResolveServicesScope extends IocResolveScope<ResolveServicesContext> {

    setup() {
        this.use(ResovleServicesInTargetAction)
            .use(ResovleServicesRefsAction)
            .use(ResovleServicesInRaiseAction);
    }
}
