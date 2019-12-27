import { IocResolveScope, IActionSetup } from '@tsdi/ioc';
import { ResovleServicesInClassAction } from './ResovleServicesInClassAction';
import { ResovleServicesAction } from './ResovleServicesAction';




export class ResolveServicesScope extends IocResolveScope implements IActionSetup {

    setup() {
        this.use(ResovleServicesInClassAction)
            .use(ResovleServicesAction);
    }
}
