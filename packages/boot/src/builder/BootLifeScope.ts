import { BuildHandles, AnnoationContext } from '../core';
import { BootProvidersHandle } from './BootProvidersHandle';
import { BootDepsHandle } from './BootDepsHandle';
import { BootConfigureLoadHandle } from './BootConfigureLoadHandle';
import { RegisterModuleScope } from './RegisterModuleScope';
import { ModuleBuildScope } from './ModuleBuildScope';
import { BootConfigureRegisterHandle } from './BootConfigureRegisterHandle';
import { ResolveRunnableScope } from './ResolveRunnableScope';
import { RunBootHandle } from './RunBootHandle';
import { ModuleConfigureRegisterHandle } from './ModuleConfigureRegisterHandle';
import { ConfigureServiceHandle } from './ConfigureServiceHandle';


export class BootLifeScope extends BuildHandles<AnnoationContext> {

    setup() {
        this.use(BootProvidersHandle)
            .use(BootDepsHandle)
            .use(BootConfigureLoadHandle)
            .use(RegisterModuleScope)
            .use(BootConfigureRegisterHandle)
            .use(ModuleBuildScope)
            .use(ModuleConfigureRegisterHandle)
            .use(ConfigureServiceHandle)
            .use(ResolveRunnableScope)
            .use(RunBootHandle);
    }
}
