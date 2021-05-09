import { IActionSetup } from '@tsdi/ioc';
import { ApplicationContext, ModuleContext } from '../Context';
import {
    BuildHandles, BootConfigureRegisterHandle, RegBootEnvScope, StartupGlobalService, BootstrapScope
} from './handles';


// /**
//  * runable build scope.
//  */
//  export class RunnableBuildLifeScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

//     setup() {
//         this.use(
//             RegisterModuleScope,
//             ResolveTypeHandle,
//             ResolveBootHandle
//         );
//     }
// }

/**
 * startup service scope.
 */
// export class StartupServiceScope extends BuildHandles<BootContext> implements IActionSetup {

//     setup() {
//         this.use(ResolveBootHandle);
//     }
// }



/**
 * boot life scope.
 */
export class BootLifeScope extends BuildHandles<ApplicationContext> implements IActionSetup {

    setup() {
        this.use(
            RegBootEnvScope,
            // RegisterModuleScope,
            BootConfigureRegisterHandle,
            // ResolveTypeHandle,
            StartupGlobalService,
            BootstrapScope
            // ResolveBootHandle
        );
    }
}
