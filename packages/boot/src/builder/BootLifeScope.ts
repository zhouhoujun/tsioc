import { CompositeHandle, AnnoationContext } from '../core';
import { BootProvidersHandle } from './BootProvidersHandle';
import { BootDepsHandle } from './BootDepsHandle';
import { BootConfigureLoadHandle } from './BootConfigureLoadHandle';
import { RegisterModuleScope } from './RegisterModuleScope';
import { ModuleBuildScope } from './ModuleBuildScope';
import { BootConfigureRegisterHandle } from './BootConfigureRegisterHandle';
import { ResolveRunnableHandle } from './ResolveRunnableHandle';
import { RunBootHandle } from './RunBootHandle';


export class BootLifeScope extends CompositeHandle<AnnoationContext> {

    setup() {
        this.use(BootProvidersHandle)
            .use(BootDepsHandle)
            .use(BootConfigureLoadHandle)
            .use(RegisterModuleScope, true)
            .use(ModuleBuildScope, true)
            .use(BootConfigureRegisterHandle)
            .use(ResolveRunnableHandle, true)
            .use(RunBootHandle);
    }
}
