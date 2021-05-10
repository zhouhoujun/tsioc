import { IActionSetup } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';
import {
    BuildHandles, BootConfigureRegisterHandle, StartupGlobalService, BootstrapScope, BootConfigureLoadHandle
} from './handles';

/**
 * boot life scope.
 */
export class BootLifeScope extends BuildHandles<ApplicationContext> implements IActionSetup {

    setup() {
        this.use(
            BootConfigureLoadHandle,
            // RegisterModuleScope,
            BootConfigureRegisterHandle,
            // ResolveTypeHandle,
            StartupGlobalService,
            BootstrapScope
            // ResolveBootHandle
        );
    }
}
