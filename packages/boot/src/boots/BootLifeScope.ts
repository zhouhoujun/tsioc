import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/BuildHandles';
import { IAnnoationContext } from '../AnnoationContext';
import {
    BootDepsHandle, BootProvidersHandle, BootConfigureLoadHandle, RegisterModuleScope,
    BootConfigureRegisterHandle, ModuleBuildScope, ModuleConfigureRegisterHandle, ConfigureServiceHandle,
    ResolveRunnableScope, StartupBootHandle
} from './boot-handles';




export class BootLifeScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    setup() {
        this.use(BootDepsHandle)
            .use(BootProvidersHandle)
            .use(BootConfigureLoadHandle)
            .use(RegisterModuleScope)
            .use(BootConfigureRegisterHandle)
            .use(ModuleBuildScope)
            .use(ModuleConfigureRegisterHandle)
            .use(ConfigureServiceHandle)
            .use(ResolveRunnableScope)
            .use(StartupBootHandle);
    }
}
