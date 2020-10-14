import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/handles';
import { IAnnoationContext } from '../Context';
import {
    RegisterModuleScope, ModuleBuildScope, ResolveRunnableScope, StartupBootHandle,
    RegBootEnvScope, BootConfigureRegisterHandle, StatupServiceScope, ResolveBootHandle
} from './handles';


export class RunnableBuildLifeScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    setup() {
        this.use(RegisterModuleScope)
            .use(ModuleBuildScope)
            .use(ResolveRunnableScope)
            .use(StartupBootHandle);
    }
}

export class StartupServiceScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    setup() {
        this.use(ResolveBootHandle)
            .use(ResolveRunnableScope)
            .use(StartupBootHandle);
    }
}

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
