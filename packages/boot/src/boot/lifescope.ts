import { IActionSetup } from '@tsdi/ioc';
import { IAnnoationContext } from '../Context';
import {
    BuildHandles, RegisterModuleScope, ModuleBuildScope, ResolveBootHandle,
    RegBootEnvScope, BootConfigureRegisterHandle, StartupGlobalService
} from './handles';


/**
 * runable build scope.
 */
 export class RunnableBuildLifeScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    setup() {
        this.use(
            RegisterModuleScope,
            ModuleBuildScope,
            ResolveBootHandle
        );
    }
}

/**
 * startup service scope.
 */
export class StartupServiceScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    setup() {
        this.use(ResolveBootHandle);
    }
}

/**
 * boot life scope.
 */
export class BootLifeScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    setup() {
        this.use(
            RegBootEnvScope,
            RegisterModuleScope,
            BootConfigureRegisterHandle,
            ModuleBuildScope,
            StartupGlobalService,
            ResolveBootHandle
        );
    }
}
