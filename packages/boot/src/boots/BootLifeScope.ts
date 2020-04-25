import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/BuildHandles';
import { IAnnoationContext } from '../AnnoationContext';
import {
    RegBootEnvScope, RegisterModuleScope,
    BootConfigureRegisterHandle, ModuleBuildScope,
    ResolveRunnableScope, StartupBootHandle, StatupServiceScope
} from './boot-handles';




export class BootLifeScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    setup() {
        this.use(RegBootEnvScope)
            .use(RegisterModuleScope)
            .use(BootConfigureRegisterHandle)
            .use(ModuleBuildScope)
            .use(StatupServiceScope)
            .use(ResolveRunnableScope)
            .use(StartupBootHandle);
    }
}
