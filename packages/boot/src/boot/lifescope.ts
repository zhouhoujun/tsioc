import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/handles';
import { AnnoationContext } from '../Context';
import {
    RegisterModuleScope, ModuleBuildScope, ResolveRunnableScope, StartupBootHandle,
    RegBootEnvScope, BootConfigureRegisterHandle, StatupServiceScope
} from './handles';


export class RunnableBuildLifeScope extends BuildHandles<AnnoationContext> implements IActionSetup {

    setup() {
        this.use(RegisterModuleScope)
            .use(ModuleBuildScope)
            .use(ResolveRunnableScope)
            .use(StartupBootHandle);
    }
}



export class BootLifeScope extends BuildHandles<AnnoationContext> implements IActionSetup {

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
