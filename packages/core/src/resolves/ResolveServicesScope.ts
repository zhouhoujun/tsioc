import { IocResolveScope, IActionSetup } from '@tsdi/ioc';
import { ResovleServicesInTargetAction } from './ResovleServicesInTargetAction';
import { ResovleServicesInRaiseAction } from './ResovleServicesInRaiseAction';
import { ResovleServicesRefsAction } from './ResovleServicesRefsAction';



export class ResolveServicesScope extends IocResolveScope implements IActionSetup {

    setup() {
        this.use(ResovleServicesInTargetAction)
            .use(ResovleServicesRefsAction)
            .use(ResovleServicesInRaiseAction);
    }
}
