import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/handles';
import { IAnnoationContext } from '../Context';
import {
    RegisterModuleScope, ModuleBuildScope, ResolveBootHandle, StartupBootstrap,
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
            StartupBootstrap
        );
    }
}

/**
 * startup service scope.
 */
export class StartupServiceScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    setup() {
        this.use(ResolveBootHandle, StartupBootstrap);
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
            StartupBootstrap
        );
    }
}
