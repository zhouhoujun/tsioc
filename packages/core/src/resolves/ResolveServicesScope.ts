import { IocCompositeAction } from '@tsdi/ioc';
import { ResolveServicesContext } from './ResolveServicesContext';
import { ResovleServicesInTargetAction } from './ResovleServicesInTargetAction';
import { ResovleServicesInRaiseAction } from './ResovleServicesInRaiseAction';
import { ResovleServicesRefsAction } from './ResovleServicesRefsAction';



export class ResolveServicesScope extends IocCompositeAction<ResolveServicesContext<any>> {

    setup() {
        this.use(ResovleServicesInTargetAction)
            .use(ResovleServicesRefsAction)
            .use(ResovleServicesInRaiseAction);
    }
}
