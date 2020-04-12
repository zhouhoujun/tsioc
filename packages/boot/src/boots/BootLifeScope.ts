import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/BuildHandles';
import { IAnnoationContext } from '../AnnoationContext';
import {
    RegBootEnvScope, RegisterModuleScope,
    BootConfigureRegisterHandle, ModuleBuildScope, ModuleConfigureRegisterHandle,
    ResolveRunnableScope, StartupBootHandle, ConfigureServiceScope
} from './boot-handles';




export class BootLifeScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    setup() {
        this.use(RegBootEnvScope)
            .use(RegisterModuleScope)
            .use(BootConfigureRegisterHandle)
            .use(ModuleBuildScope)
            .use(ModuleConfigureRegisterHandle)
            .use(ConfigureServiceScope)
            .use(ResolveRunnableScope)
            .use(StartupBootHandle);
    }
}
