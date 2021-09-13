import { IActionSetup } from '@tsdi/ioc';
import { ApplicationContext } from '../Context';
import {
    BuildHandles, ConfigureRegisterHandle, StartupGlobalService, BootstrapScope, ConfigureLoadHandle
} from './handles';

/**
 * boot life scope.
 */
export class BootLifeScope extends BuildHandles<ApplicationContext> implements IActionSetup {

    setup() {
        this.use(
            ConfigureLoadHandle,
            ConfigureRegisterHandle,
            StartupGlobalService,
            BootstrapScope
        );
    }
}
