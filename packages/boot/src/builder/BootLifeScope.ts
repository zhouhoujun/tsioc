import { BuildHandles, AnnoationContext } from '../core';
import { BootProvidersHandle } from './BootProvidersHandle';
import { BootDepsHandle } from './BootDepsHandle';
import { BootConfigureLoadHandle } from './BootConfigureLoadHandle';
import { RegisterModuleScope } from './RegisterModuleScope';
import { ModuleBuildScope } from './ModuleBuildScope';
import { BootConfigureRegisterHandle } from './BootConfigureRegisterHandle';
import { ResolveRunnableScope } from './ResolveRunnableScope';
import { RunBootHandle } from './RunBootHandle';


export class BootLifeScope extends BuildHandles<AnnoationContext> {

    setup() {
        this.use(BootProvidersHandle)
            .use(BootDepsHandle)
            .use(BootConfigureLoadHandle)
            .use(RegisterModuleScope, true)
            .use(ModuleBuildScope, true)
            .use(BootConfigureRegisterHandle)
            .use(ResolveRunnableScope, true)
            .use(RunBootHandle);
    }
}
